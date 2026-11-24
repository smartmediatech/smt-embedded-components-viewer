export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatarUri?: string;
}

export interface ApiUserResponse {
  id: string;
  properties: {
    first_name?: string;
    last_name?: string;
    avatar_uri?: string;
  };
}

/** `POST /v1/user/login`: email and password. */
export interface ApiLoginPayload {
  token: string;
  token_type: "email";
  auth_data: { password: string };
}

export interface ApiLoginResponse {
  request_id: string;
  payload: {
    access_token: { token: string; expires_in: number };
    refresh_token: { token: string };
  };
}

export interface ApiGetUserResponse {
  request_id: string;
  payload: ApiUserResponse;
}
