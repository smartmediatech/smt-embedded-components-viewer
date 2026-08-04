export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatarUri?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// API Response Types
export interface ApiLoginPayload {
  token: string;
  token_type: string;
  auth_data: {
    password: string;
  };
}

export interface ApiUserResponse {
  id: string;
  properties: {
    first_name?: string;
    last_name?: string;
    avatar_uri?: string;
  };
}

export interface ApiLoginResponse {
  request_id: string;
  payload: {
    user: ApiUserResponse;
    access_token: {
      token: string;
      token_type: string;
      expires_in: number;
    };
    refresh_token: {
      token: string;
      token_type: string;
      expires_in: number;
    };
  };
}

export interface ApiGetUserResponse {
  request_id: string;
  payload: ApiUserResponse;
}
