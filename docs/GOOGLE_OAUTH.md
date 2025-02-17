# Instruction on Creating Google Client ID and Secret

## Creating the credential

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. From the projects list, select a project or create a new one.
3. Menu -> APIs & services -> Credentials.
4. Click Create Credentials, then select OAuth client ID.  
   ( **Remark**: If this is your first time creating a client ID, you need to configure your **OAuth consent screen** first. by clicking Consent Screen. Follow the instruction in [Configuring the OAuth consent screen](#configuring-the-oauth-consent-screen) to set up the Consent screen.)
5. In **Application Type**, select _Web Application_.
6. For local development, add `http://localhost:5173` to **Authorized JavaScript origins** and **Authorized redirect URIs**.
7. Click _Create_.
8. Click the credential just created to find the Client ID and Client Secret.

## Configuring the OAuth consent screen

1. Menu -> APIs & Services -> OAuth consent screen
2. In the **Overview** page, click _Get Started_.
3. Fill out the app information, then click _Create_.
4. In the **Data Access** page, add the scopes. (Typically, just choose all non-sensitive scopes.) Click _Update_, then _Save_.

Now you are ready to create the credential. Go back to [Creating the credential](#creating-the-credential).
