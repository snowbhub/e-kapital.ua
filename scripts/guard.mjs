if (process.env.USE_MOCK_DATA === "true")
  throw new Error("Mock financial data are forbidden in a production build");
if (process.env.SITE_URL && !/^https?:\/\//.test(process.env.SITE_URL))
  throw new Error("SITE_URL must be an absolute HTTP(S) URL");
