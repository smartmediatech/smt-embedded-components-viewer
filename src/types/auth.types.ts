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

export interface ApiGetUserResponse {
  request_id: string;
  payload: ApiUserResponse;
}
