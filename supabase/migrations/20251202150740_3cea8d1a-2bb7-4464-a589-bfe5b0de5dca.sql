-- Create a test organisation and invitation code for testing
INSERT INTO organisations (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test GP Organisation');

INSERT INTO invitation_codes (code, organisation_id, max_uses, is_active)
VALUES ('TESTGP2024', '11111111-1111-1111-1111-111111111111', 100, true);