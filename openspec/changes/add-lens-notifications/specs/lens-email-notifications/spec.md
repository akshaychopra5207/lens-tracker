## ADDED Requirements

### Requirement: Email Trigger on Expiry
The system SHALL identify lenses expiring on the current calendar day and trigger a one-time email notification.

#### Scenario: Lens expires today
- **WHEN** the daily sweep logic identifies a lens whose `dueAt` matches the current date
- **THEN** the system SHALL queue an email notification to the user.

### Requirement: Email Content
The notification email SHALL contain specific details about which lens is expiring.

#### Scenario: Notification details
- **WHEN** the email is generated
- **THEN** the content MUST specify the side (LEFT or RIGHT)
- **AND** the content MUST specify the `dueAt` date.

### Requirement: Email Delivery via Mail Provider
The system SHALL deliver emails using a configured third-party email service provider.

#### Scenario: Successful delivery
- **WHEN** the email service is called with valid credentials and recipient info
- **THEN** the email SHALL be sent to the user's primary email address.

### Requirement: Duplicate Prevention
The system SHALL track sent notifications to ensure a user does not receive multiple emails for the same expiry event.

#### Scenario: Prevent double-send
- **WHEN** an email has already been recorded as "sent" for a specific `cycleId` and `dueAt`
- **THEN** subsequent daily sweeps SHALL skip sending for that specific event.
