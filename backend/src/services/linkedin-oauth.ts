import { config } from '../config';
import { logger } from '../utils/logger';

export interface OAuthTokens {
  accessToken:  string;
  refreshToken: string | null;
  expiresAt:    Date;
  linkedInId:   string;
  profileName:  string;
  profileUrl:   string;
}

interface TokenResponse {
  access_token:             string;
  expires_in:               number;
  refresh_token?:           string;
  refresh_token_expires_in?: number;
}

interface ProfileResponse {
  sub:        string;
  name:       string;
  given_name: string;
  family_name: string;
  picture?:   string;
  email?:     string;
}

export class LinkedInOAuthService {
  private readonly clientId:     string;
  private readonly clientSecret: string;
  private readonly redirectUri:  string;

  constructor() {
    this.clientId     = config.LINKEDIN_CLIENT_ID     ?? '';
    this.clientSecret = config.LINKEDIN_CLIENT_SECRET ?? '';
    this.redirectUri  = config.LINKEDIN_REDIRECT_URI  ?? '';
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  /** Step 1 — Generate the LinkedIn authorization URL */
  getAuthUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new Error('LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI.');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     this.clientId,
      redirect_uri:  this.redirectUri,
      state,
      scope: 'openid profile email w_member_social',
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  /** Step 2 — Exchange auth code for tokens */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  this.redirectUri,
      client_id:     this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LinkedIn token exchange failed: ${err}`);
    }

    const tokens = (await res.json()) as TokenResponse;

    // Fetch profile info
    const profile = await this.getProfile(tokens.access_token);

    return {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt:    new Date(Date.now() + tokens.expires_in * 1000),
      linkedInId:   profile.sub,
      profileName:  profile.name,
      profileUrl:   `https://www.linkedin.com/in/${profile.sub}`,
    };
  }

  /** Step 3 — Refresh an expired access token */
  async refreshToken(refreshToken: string): Promise<Omit<OAuthTokens, 'linkedInId' | 'profileName' | 'profileUrl'>> {
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    if (!res.ok) throw new Error('Failed to refresh LinkedIn token');

    const tokens = (await res.json()) as TokenResponse;

    return {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt:    new Date(Date.now() + tokens.expires_in * 1000),
    };
  }

  /** Get LinkedIn profile via OpenID Connect userinfo */
  async getProfile(accessToken: string): Promise<ProfileResponse> {
    const res = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new Error('Failed to fetch LinkedIn profile');
    return res.json() as Promise<ProfileResponse>;
  }

  /** Publish a text post via the LinkedIn Share API */
  async publishPost(accessToken: string, linkedInId: string, content: string): Promise<string> {
    logger.info(`Publishing post for LinkedIn user ${linkedInId}`);

    const body = {
      author:     `urn:li:person:${linkedInId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary:    { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to publish LinkedIn post: ${err}`);
    }

    const data = (await res.json()) as { id: string };
    return data.id;
  }
}

export const linkedInOAuthService = new LinkedInOAuthService();
