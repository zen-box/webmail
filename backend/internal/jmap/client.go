package jmap

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	httpClient *http.Client
	baseURL    string
	username   string
	password   string
	session    *Session
}

func NewClient(baseURL, username, password string) *Client {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	return &Client{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true, // Supports internal network self-signed certificates & intranet IPs
				},
			},
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 10 {
					return fmt.Errorf("stopped after 10 redirects")
				}
				// Preserve Authorization header on same-host redirects
				if len(via) > 0 && req.URL.Host == via[0].URL.Host {
					if auth := via[0].Header.Get("Authorization"); auth != "" {
						req.Header.Set("Authorization", auth)
					}
				}
				return nil
			},
		},
		baseURL:  baseURL,
		username: username,
		password: password,
	}
}

// FetchSession discovers JMAP capabilities from Stalwart
func (c *Client) FetchSession(ctx context.Context) (*Session, error) {
	cleanBaseURL := strings.TrimRight(strings.TrimSpace(c.baseURL), "/")
	url := fmt.Sprintf("%s/.well-known/jmap", cleanBaseURL)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	if c.username != "" {
		req.SetBasicAuth(c.username, c.password)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("connect to stalwart jmap failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("jmap session error (status %d): %s", resp.StatusCode, string(body))
	}

	var session Session
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		return nil, fmt.Errorf("decode jmap session failed: %w", err)
	}

	c.session = &session
	return &session, nil
}

// Call dispatches a standard JMAP batch request
func (c *Client) Call(ctx context.Context, jmapReq *Request) (*Response, error) {
	if c.session == nil {
		if _, err := c.FetchSession(ctx); err != nil {
			return nil, err
		}
	}

	if jmapReq.Using == nil {
		jmapReq.Using = []string{
			"urn:ietf:params:jmap:core",
			"urn:ietf:params:jmap:mail",
			"urn:ietf:params:jmap:submission",
		}
	}

	reqData, err := json.Marshal(jmapReq)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.session.ApiURL, bytes.NewReader(reqData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.username != "" {
		req.SetBasicAuth(c.username, c.password)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("jmap api error (status %d): %s", resp.StatusCode, string(body))
	}

	var jmapResp Response
	if err := json.NewDecoder(resp.Body).Decode(&jmapResp); err != nil {
		return nil, err
	}

	return &jmapResp, nil
}

// ensureSession ensures the JMAP session is fetched so account IDs and URLs are populated
func (c *Client) ensureSession(ctx context.Context) error {
	if c.session == nil {
		_, err := c.FetchSession(ctx)
		return err
	}
	return nil
}

// GetPrimaryAccount returns default JMAP account ID
func (c *Client) GetPrimaryAccount() string {
	if c.session != nil && c.session.PrimaryAccounts != nil {
		if acc, ok := c.session.PrimaryAccounts["urn:ietf:params:jmap:mail"]; ok {
			return acc
		}
	}
	// Fallback to first available account
	if c.session != nil {
		for accID := range c.session.Accounts {
			return accID
		}
	}
	return ""
}

// GetMailboxes fetches all mailboxes for an account
func (c *Client) GetMailboxes(ctx context.Context, accountID string) ([]Mailbox, error) {
	if err := c.ensureSession(ctx); err != nil {
		return nil, err
	}
	if accountID == "" {
		accountID = c.GetPrimaryAccount()
	}

	req := &Request{
		MethodCalls: []Invocation{
			{
				Name: "Mailbox/get",
				Args: map[string]interface{}{
					"accountId": accountID,
				},
				CallID: "c1",
			},
		},
	}

	resp, err := c.Call(ctx, req)
	if err != nil {
		return nil, err
	}

	for _, call := range resp.MethodResponses {
		if call.Name == "Mailbox/get" && call.CallID == "c1" {
			data, _ := json.Marshal(call.Args)
			var result struct {
				List []Mailbox `json:"list"`
			}
			if err := json.Unmarshal(data, &result); err == nil {
				return result.List, nil
			}
		}
	}

	return nil, fmt.Errorf("no mailboxes returned")
}

// CreateMailbox creates a new mailbox (e.g. Archive) on Stalwart
func (c *Client) CreateMailbox(ctx context.Context, accountID, name, role string) (string, error) {
	if err := c.ensureSession(ctx); err != nil {
		return "", err
	}
	if accountID == "" {
		accountID = c.GetPrimaryAccount()
	}

	req := &Request{
		MethodCalls: []Invocation{
			{
				Name: "Mailbox/set",
				Args: map[string]interface{}{
					"accountId": accountID,
					"create": map[string]interface{}{
						"c1": map[string]interface{}{
							"name": name,
							"role": role,
						},
					},
				},
				CallID: "create_mb",
			},
		},
	}

	resp, err := c.Call(ctx, req)
	if err != nil {
		return "", err
	}

	for _, call := range resp.MethodResponses {
		if call.Name == "Mailbox/set" && call.CallID == "create_mb" {
			data, _ := json.Marshal(call.Args)
			var result struct {
				Created map[string]struct {
					ID string `json:"id"`
				} `json:"created"`
			}
			if err := json.Unmarshal(data, &result); err == nil && result.Created != nil {
				if c1, ok := result.Created["c1"]; ok && c1.ID != "" {
					return c1.ID, nil
				}
			}
		}
	}

	return "", fmt.Errorf("create mailbox failed")
}

// QueryEmails queries email IDs matching filter and sort
func (c *Client) QueryEmails(ctx context.Context, accountID string, filter *EmailFilter, position, limit int) (*EmailQueryResult, error) {
	if err := c.ensureSession(ctx); err != nil {
		return nil, err
	}
	if accountID == "" {
		accountID = c.GetPrimaryAccount()
	}

	filterMap := make(map[string]interface{})
	if filter != nil {
		if filter.InMailbox != "" {
			filterMap["inMailbox"] = filter.InMailbox
		}
		if filter.HasKeyword != "" {
			filterMap["hasKeyword"] = filter.HasKeyword
		}
		if filter.NotKeyword != "" {
			filterMap["notKeyword"] = filter.NotKeyword
		}
		if filter.Text != "" {
			filterMap["text"] = filter.Text
		}
	}

	args := map[string]interface{}{
		"accountId":      accountID,
		"position":       position,
		"limit":          limit,
		"calculateTotal": true,
		"sort": []map[string]interface{}{
			{
				"property":    "receivedAt",
				"isAscending": false,
			},
		},
	}
	if len(filterMap) > 0 {
		args["filter"] = filterMap
	}

	req := &Request{
		MethodCalls: []Invocation{
			{
				Name:   "Email/query",
				Args:   args,
				CallID: "q1",
			},
		},
	}

	resp, err := c.Call(ctx, req)
	if err != nil {
		return nil, err
	}

	for _, call := range resp.MethodResponses {
		if call.Name == "Email/query" && call.CallID == "q1" {
			data, _ := json.Marshal(call.Args)
			var result EmailQueryResult
			if err := json.Unmarshal(data, &result); err == nil {
				return &result, nil
			}
		}
	}

	return nil, fmt.Errorf("query emails failed")
}

// GetEmails loads detailed email objects for given IDs
func (c *Client) GetEmails(ctx context.Context, accountID string, ids []string) ([]Email, error) {
	if err := c.ensureSession(ctx); err != nil {
		return nil, err
	}
	if accountID == "" {
		accountID = c.GetPrimaryAccount()
	}

	req := &Request{
		MethodCalls: []Invocation{
			{
				Name: "Email/get",
				Args: map[string]interface{}{
					"accountId": accountID,
					"ids":       ids,
					"fetchAllBodyValues": true,
				},
				CallID: "g1",
			},
		},
	}

	resp, err := c.Call(ctx, req)
	if err != nil {
		return nil, err
	}

	for _, call := range resp.MethodResponses {
		if call.Name == "Email/get" && call.CallID == "g1" {
			data, _ := json.Marshal(call.Args)
			var result struct {
				List []Email `json:"list"`
			}
			if err := json.Unmarshal(data, &result); err == nil {
				return result.List, nil
			}
		}
	}

	return nil, fmt.Errorf("get emails failed")
}

// SetEmailKeywords updates keywords (e.g. $seen, $flagged)
func (c *Client) SetEmailKeywords(ctx context.Context, accountID, emailID string, keywords map[string]bool) error {
	if err := c.ensureSession(ctx); err != nil {
		return err
	}
	if accountID == "" {
		accountID = c.GetPrimaryAccount()
	}

	patch := make(map[string]interface{})
	for k, v := range keywords {
		if v {
			patch["keywords/"+k] = true
		} else {
			patch["keywords/"+k] = nil
		}
	}

	req := &Request{
		MethodCalls: []Invocation{
			{
				Name: "Email/set",
				Args: map[string]interface{}{
					"accountId": accountID,
					"update": map[string]interface{}{
						emailID: patch,
					},
				},
				CallID: "s1",
			},
		},
	}

	_, err := c.Call(ctx, req)
	return err
}

// MoveEmail moves an email to target mailbox
func (c *Client) MoveEmail(ctx context.Context, accountID, emailID, targetMailboxID string) error {
	if err := c.ensureSession(ctx); err != nil {
		return err
	}
	if accountID == "" {
		accountID = c.GetPrimaryAccount()
	}

	req := &Request{
		MethodCalls: []Invocation{
			{
				Name: "Email/set",
				Args: map[string]interface{}{
					"accountId": accountID,
					"update": map[string]interface{}{
						emailID: map[string]interface{}{
							"mailboxIds": map[string]bool{
								targetMailboxID: true,
							},
						},
					},
				},
				CallID: "m1",
			},
		},
	}

	_, err := c.Call(ctx, req)
	return err
}

// DeleteEmail permanently destroys an email or removes it
func (c *Client) DeleteEmail(ctx context.Context, accountID, emailID string) error {
	if err := c.ensureSession(ctx); err != nil {
		return err
	}
	if accountID == "" {
		accountID = c.GetPrimaryAccount()
	}

	req := &Request{
		MethodCalls: []Invocation{
			{
				Name: "Email/set",
				Args: map[string]interface{}{
					"accountId": accountID,
					"destroy":   []string{emailID},
				},
				CallID: "d1",
			},
		},
	}

	_, err := c.Call(ctx, req)
	return err
}

// UploadBlob uploads binary attachment data to Stalwart Blob store
func (c *Client) UploadBlob(ctx context.Context, accountID, contentType string, reader io.Reader) (*UploadResponse, error) {
	if c.session == nil {
		if _, err := c.FetchSession(ctx); err != nil {
			return nil, err
		}
	}
	if accountID == "" {
		accountID = c.GetPrimaryAccount()
	}

	uploadURL := strings.Replace(c.session.UploadURL, "{accountId}", accountID, -1)
	req, err := http.NewRequestWithContext(ctx, "POST", uploadURL, reader)
	if err != nil {
		return nil, err
	}

	if contentType == "" {
		contentType = "application/octet-stream"
	}
	req.Header.Set("Content-Type", contentType)
	if c.username != "" {
		req.SetBasicAuth(c.username, c.password)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("upload blob failed (status %d): %s", resp.StatusCode, string(body))
	}

	var uploadResp UploadResponse
	if err := json.NewDecoder(resp.Body).Decode(&uploadResp); err != nil {
		return nil, err
	}

	return &uploadResp, nil
}

// DownloadBlob downloads binary attachment data from Stalwart Blob store
func (c *Client) DownloadBlob(ctx context.Context, accountID, blobID, name string) (io.ReadCloser, string, error) {
	if c.session == nil {
		if _, err := c.FetchSession(ctx); err != nil {
			return nil, "", err
		}
	}
	if accountID == "" {
		accountID = c.GetPrimaryAccount()
	}

	dlURL := strings.Replace(c.session.DownloadURL, "{accountId}", accountID, -1)
	dlURL = strings.Replace(dlURL, "{blobId}", blobID, -1)
	dlURL = strings.Replace(dlURL, "{name}", name, -1)
	dlURL = strings.Replace(dlURL, "{type}", "application/octet-stream", -1)

	req, err := http.NewRequestWithContext(ctx, "GET", dlURL, nil)
	if err != nil {
		return nil, "", err
	}

	if c.username != "" {
		req.SetBasicAuth(c.username, c.password)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, "", err
	}

	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, "", fmt.Errorf("download blob error (status %d)", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	return resp.Body, contentType, nil
}

// SendEmail submits a new email via JMAP Email/set and EmailSubmission/set with support for multiple To, Cc, and Bcc
func (c *Client) SendEmail(ctx context.Context, accountID, fromEmail, fromName string, toList, ccList, bccList []string, subject, body string, sentMailboxID string) (*Email, error) {
	if accountID == "" {
		accountID = c.GetPrimaryAccount()
	}

	// Auto-locate Sent mailbox if not explicitly specified
	mailboxIds := make(map[string]bool)
	if sentMailboxID == "" {
		if mboxes, err := c.GetMailboxes(ctx, accountID); err == nil {
			for _, mb := range mboxes {
				r := strings.ToLower(strings.TrimSpace(mb.Role))
				n := strings.ToLower(strings.TrimSpace(mb.Name))
				if r == "sent" || n == "sent" || n == "sent items" || n == "sent messages" || n == "已发送" {
					sentMailboxID = mb.ID
					break
				}
			}
		}
	}
	if sentMailboxID != "" {
		mailboxIds[sentMailboxID] = true
	}

	draftID := fmt.Sprintf("draft-%d", time.Now().UnixNano())

	toAddresses := make([]map[string]string, 0, len(toList))
	for _, to := range toList {
		to = strings.TrimSpace(to)
		if to != "" {
			toAddresses = append(toAddresses, map[string]string{"name": to, "email": to})
		}
	}

	ccAddresses := make([]map[string]string, 0, len(ccList))
	for _, cc := range ccList {
		cc = strings.TrimSpace(cc)
		if cc != "" {
			ccAddresses = append(ccAddresses, map[string]string{"name": cc, "email": cc})
		}
	}

	bccAddresses := make([]map[string]string, 0, len(bccList))
	for _, bcc := range bccList {
		bcc = strings.TrimSpace(bcc)
		if bcc != "" {
			bccAddresses = append(bccAddresses, map[string]string{"name": bcc, "email": bcc})
		}
	}

	// RFC 8622: The submission envelope rcptTo MUST contain all recipients (To + Cc + Bcc)
	rcptTo := make([]map[string]string, 0, len(toAddresses)+len(ccAddresses)+len(bccAddresses))
	seenRcpt := make(map[string]bool)
	for _, addr := range append(append(toAddresses, ccAddresses...), bccAddresses...) {
		em := addr["email"]
		if em != "" && !seenRcpt[strings.ToLower(em)] {
			seenRcpt[strings.ToLower(em)] = true
			rcptTo = append(rcptTo, map[string]string{"email": em})
		}
	}

	emailObj := map[string]interface{}{
		"mailboxIds": mailboxIds,
		"keywords": map[string]bool{
			"$seen": true,
		},
		"from": []map[string]string{
			{"name": fromName, "email": fromEmail},
		},
		"to":      toAddresses,
		"subject": subject,
		"bodyValues": map[string]interface{}{
			"textPart": map[string]string{
				"value": body,
			},
		},
		"textBody": []map[string]string{
			{"partId": "textPart", "type": "text/plain"},
		},
	}

	if len(ccAddresses) > 0 {
		emailObj["cc"] = ccAddresses
	}
	if len(bccAddresses) > 0 {
		emailObj["bcc"] = bccAddresses
	}

	req := &Request{
		Using: []string{
			"urn:ietf:params:jmap:core",
			"urn:ietf:params:jmap:mail",
			"urn:ietf:params:jmap:submission",
		},
		MethodCalls: []Invocation{
			{
				Name: "Email/set",
				Args: map[string]interface{}{
					"accountId": accountID,
					"create": map[string]interface{}{
						draftID: emailObj,
					},
				},
				CallID: "m1",
			},
			{
				Name: "EmailSubmission/set",
				Args: map[string]interface{}{
					"accountId": accountID,
					"create": map[string]interface{}{
						"sub1": map[string]interface{}{
							"emailId": "#m1/created/" + draftID + "/id",
							"envelope": map[string]interface{}{
								"mailFrom": map[string]string{"email": fromEmail},
								"rcptTo":   rcptTo,
							},
						},
					},
				},
				CallID: "m2",
			},
		},
	}

	resp, err := c.Call(ctx, req)
	if err != nil {
		return nil, err
	}

	createdEmailID := ""
	for _, call := range resp.MethodResponses {
		if call.Name == "Email/set" && call.CallID == "m1" {
			data, _ := json.Marshal(call.Args)
			var setResp struct {
				Created map[string]struct {
					ID string `json:"id"`
				} `json:"created"`
			}
			_ = json.Unmarshal(data, &setResp)
			if cr, ok := setResp.Created[draftID]; ok {
				createdEmailID = cr.ID
			}
		}
	}

	if createdEmailID == "" {
		return nil, fmt.Errorf("email creation failed in jmap")
	}

	toResult := make([]EmailAddress, 0, len(toAddresses))
	for _, t := range toAddresses {
		toResult = append(toResult, EmailAddress{Name: t["name"], Email: t["email"]})
	}

	return &Email{
		ID:         createdEmailID,
		Subject:    subject,
		Preview:    body,
		ReceivedAt: time.Now().Format(time.RFC3339),
		From:       []EmailAddress{{Name: fromName, Email: fromEmail}},
		To:         toResult,
	}, nil
}
