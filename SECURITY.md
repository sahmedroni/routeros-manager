# Security Configuration

## Required Environment Variables

This application **requires** the following environment variables to be set:

| Variable | Description | Minimum Length |
|----------|-------------|----------------|
| `JWT_SECRET` | Secret key for signing JWT tokens | 32 characters |
| `ENCRYPTION_KEY` | Secret key for encrypting router passwords | 32 characters |

## Generating Secure Secrets

Run the following command to generate secure random secrets:

```bash
cd backend
npm run generate-secrets
```

This will output two random base64-encoded strings that you can copy to your `.env` file.

Alternatively, generate manually:

```bash
# Generate JWT_SECRET
openssl rand -base64 64

# Generate ENCRYPTION_KEY
openssl rand -base64 64
```

## Setting Up Environment Variables

1. Copy the example env file:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env` and set your secrets:
   ```
   JWT_SECRET=your-generated-jwt-secret-here
   ENCRYPTION_KEY=your-generated-encryption-key-here
   ```

## Security Notes

- **Never commit** `.env` files to version control
- Use unique secrets for each environment (development, staging, production)
- Rotate secrets periodically
- The application will fail to start if secrets are not configured
