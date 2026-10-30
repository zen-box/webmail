package jmap

import "encoding/json"

// RFC 8620 Core JMAP Session
type Session struct {
	Capabilities    map[string]interface{} `json:"capabilities"`
	Accounts        map[string]Account     `json:"accounts"`
	PrimaryAccounts map[string]string      `json:"primaryAccounts"`
	Username        string                 `json:"username"`
	ApiURL          string                 `json:"apiUrl"`
	DownloadURL     string                 `json:"downloadUrl"`
	UploadURL       string                 `json:"uploadUrl"`
	EventSourceURL  string                 `json:"eventSourceUrl"`
	State           string                 `json:"state"`
}

type Account struct {
	Name                string                 `json:"name"`
	IsPersonal          bool                   `json:"isPersonal"`
	IsReadOnly          bool                   `json:"isReadOnly"`
	AccountCapabilities map[string]interface{} `json:"accountCapabilities"`
}

// RFC 8620 Request & Response
type Request struct {
	Using       []string          `json:"using"`
	MethodCalls []Invocation      `json:"methodCalls"`
	CreatedIDs  map[string]string `json:"createdIds,omitempty"`
}

type Invocation struct {
	Name   string
	Args   interface{}
	CallID string
}

func (inv Invocation) MarshalJSON() ([]byte, error) {
	return json.Marshal([]interface{}{inv.Name, inv.Args, inv.CallID})
}

func (inv *Invocation) UnmarshalJSON(data []byte) error {
	var raw []json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	if len(raw) >= 3 {
		_ = json.Unmarshal(raw[0], &inv.Name)
		_ = json.Unmarshal(raw[1], &inv.Args)
		_ = json.Unmarshal(raw[2], &inv.CallID)
	}
	return nil
}

type Response struct {
	MethodResponses []Invocation `json:"methodResponses"`
	SessionState    string       `json:"sessionState"`
}

// RFC 8621 Mailbox
type Mailbox struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	ParentID     string `json:"parentId,omitempty"`
	Role         string `json:"role,omitempty"` // inbox, drafts, sent, trash, archive, junk
	SortOrder    int    `json:"sortOrder"`
	TotalEmails  int    `json:"totalEmails"`
	UnreadEmails int    `json:"unreadEmails"`
}

// RFC 8621 EmailAddress
type EmailAddress struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}

// RFC 8621 Email
type Email struct {
	ID          string                   `json:"id"`
	BlobID      string                   `json:"blobId,omitempty"`
	ThreadID    string                   `json:"threadId,omitempty"`
	MailboxIDs  map[string]bool          `json:"mailboxIds"`
	Keywords    map[string]bool          `json:"keywords"` // $seen, $flagged, $draft, $answered
	Size        int64                    `json:"size,omitempty"`
	ReceivedAt  string                   `json:"receivedAt"`
	Subject     string                   `json:"subject"`
	Preview     string                   `json:"preview"`
	MessageID   []string                 `json:"messageId,omitempty"`
	InReplyTo   []string                 `json:"inReplyTo,omitempty"`
	References  []string                 `json:"references,omitempty"`
	From        []EmailAddress           `json:"from,omitempty"`
	To          []EmailAddress           `json:"to,omitempty"`
	Cc          []EmailAddress           `json:"cc,omitempty"`
	Bcc         []EmailAddress           `json:"bcc,omitempty"`
	ReplyTo     []EmailAddress           `json:"replyTo,omitempty"`
	BodyValues  map[string]BodyPartValue `json:"bodyValues,omitempty"`
	TextBody    []BodyPart               `json:"textBody,omitempty"`
	HtmlBody    []BodyPart               `json:"htmlBody,omitempty"`
	Attachments []Attachment             `json:"attachments,omitempty"`
}

type BodyPart struct {
	PartID string `json:"partId"`
	Type   string `json:"type"`
	BlobID string `json:"blobId,omitempty"`
	Size   int64  `json:"size,omitempty"`
	Name   string `json:"name,omitempty"`
	CID    string `json:"cid,omitempty"`
}

type BodyPartValue struct {
	Value       string `json:"value"`
	IsTruncated bool   `json:"isTruncated"`
}

type Attachment struct {
	PartID string `json:"partId"`
	BlobID string `json:"blobId"`
	Name   string `json:"name"`
	Type   string `json:"type"`
	Size   int64  `json:"size"`
	CID    string `json:"cid,omitempty"`
}

// RFC 8620 Upload Response
type UploadResponse struct {
	AccountID string `json:"accountId"`
	BlobID    string `json:"blobId"`
	Type      string `json:"type"`
	Size      int64  `json:"size"`
}

// Email Filter & Query
type EmailFilter struct {
	InMailbox  string `json:"inMailbox,omitempty"`
	HasKeyword string `json:"hasKeyword,omitempty"`
	NotKeyword string `json:"notKeyword,omitempty"`
	Text       string `json:"text,omitempty"`
	After      string `json:"after,omitempty"`
	Before     string `json:"before,omitempty"`
}

type SortOrder struct {
	Property    string `json:"property"`
	IsAscending bool   `json:"isAscending"`
}

type EmailQueryResult struct {
	AccountID string   `json:"accountId"`
	QueryState string  `json:"queryState"`
	Total     int      `json:"total"`
	IDs       []string `json:"ids"`
	Position  int      `json:"position"`
}

// Email Changes (RFC 8621)
type EmailChanges struct {
	AccountID      string   `json:"accountId"`
	OldState       string   `json:"oldState"`
	NewState       string   `json:"newState"`
	HasMoreChanges bool     `json:"hasMoreChanges"`
	Created        []string `json:"created"`
	Updated        []string `json:"updated"`
	Destroyed      []string `json:"destroyed"`
}

// New Email Draft
type NewEmailDraft struct {
	From        []EmailAddress `json:"from"`
	To          []EmailAddress `json:"to"`
	Cc          []EmailAddress `json:"cc,omitempty"`
	Bcc         []EmailAddress `json:"bcc,omitempty"`
	ReplyTo     []EmailAddress `json:"replyTo,omitempty"`
	Subject     string         `json:"subject"`
	TextBody    string         `json:"textBody,omitempty"`
	HtmlBody    string         `json:"htmlBody,omitempty"`
	InReplyTo   string         `json:"inReplyTo,omitempty"`
	References  string         `json:"references,omitempty"`
	Attachments []Attachment   `json:"attachments,omitempty"`
}
