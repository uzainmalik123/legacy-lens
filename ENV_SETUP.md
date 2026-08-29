# Environment Setup for Legacy Lens Bob Analysis

To enable live IBM Bob analysis, create a `.env.local` file in the repository
root with the following variables:

```
BOB_API_URL=https://api.us-east.bob.ibm.com/inference/v1
BOB_API_KEY=your_ibm_bob_api_key_here
BOB_MODEL=your_bob_model_id_here
```

**Variables:**

| Variable | Description | Required |
|----------|-------------|----------|
| `BOB_API_URL` | Bob inference base URL (OpenAI-compatible endpoint) | Yes |
| `BOB_API_KEY` | Bob API key — Bearer token | Yes |
| `BOB_MODEL` | Model ID to use for analysis | No (defaults to `ibm/granite-3-3-8b-instruct`) |

**Notes:**

- Never commit `.env.local` — it is already in `.gitignore`.
- If `BOB_API_URL` or `BOB_API_KEY` is missing, clicking **Analyze Change** will
  return an error: *"Analysis not configured — check environment variables."*
- The development fixture mode remains available at all times regardless of
  whether credentials are configured.
- Credentials are used server-side only and are never exposed to the browser.
