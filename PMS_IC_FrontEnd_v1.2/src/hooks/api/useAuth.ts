import { useMutation } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};

interface LoginResponse {
  token: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function useLogin() {
  return useMutation<LoginResponse, Error, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      const response = await apiService.login(email, password);
      if (response?.token) {
        apiService.setToken(response.token);
      }
      return response;
    },
  });
}

export function useSetToken() {
  return {
    setToken: (token: string) => apiService.setToken(token),
    clearToken: () => apiService.setToken(''),
  };
}
