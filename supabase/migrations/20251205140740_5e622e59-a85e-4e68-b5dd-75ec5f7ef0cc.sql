-- Change default for require_oncall to true
ALTER TABLE rota_rules 
ALTER COLUMN require_oncall SET DEFAULT true;