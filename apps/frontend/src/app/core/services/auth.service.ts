import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { User, AuthResponse, UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';

const ACCESS_TOKEN_KEY = 'sd_access_token';
const REFRESH_TOKEN_KEY = 'sd_refresh_token';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  private readonly _currentUser = signal<User | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly isCustomer = computed(() => this._currentUser()?.role === 'CUSTOMER');
  readonly isAgent = computed(() => this._currentUser()?.role === 'AGENT');
  readonly isAdmin = computed(() => this._currentUser()?.role === 'ADMIN');
  readonly isAgentOrAdmin = computed(() => {
    const role = this._currentUser()?.role;
    return role === 'AGENT' || role === 'ADMIN';
  });

  constructor() {
    this.loadUserFromToken();
  }

  register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Observable<ApiSuccess<AuthResponse>> {
    return this.http.post<ApiSuccess<AuthResponse>>(`${this.apiUrl}/auth/register`, data).pipe(
      tap((res) => this.handleAuthSuccess(res.data)),
    );
  }

  login(email: string, password: string): Observable<ApiSuccess<AuthResponse>> {
    return this.http.post<ApiSuccess<AuthResponse>>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res) => this.handleAuthSuccess(res.data)),
    );
  }

  refreshToken(): Observable<ApiSuccess<AuthResponse>> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    return this.http
      .post<ApiSuccess<AuthResponse>>(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(tap((res) => this.handleAuthSuccess(res.data)));
  }

  logout(): void {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/auth/logout`, { refreshToken }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  private handleAuthSuccess(data: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    this._currentUser.set(data.user as User);
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this._currentUser.set(null);
  }

  private loadUserFromToken(): void {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        this.clearSession();
        return;
      }
      // Fetch current user to get fresh data
      this.http
        .get<ApiSuccess<User>>(`${this.apiUrl}/users/me`)
        .pipe(catchError(() => { this.clearSession(); return throwError(() => null); }))
        .subscribe((res) => this._currentUser.set(res.data));
    } catch {
      this.clearSession();
    }
  }

  getDashboardRoute(): string {
    const role = this._currentUser()?.role;
    switch (role) {
      case 'ADMIN': return '/admin/dashboard';
      case 'AGENT': return '/agent/dashboard';
      default: return '/customer/dashboard';
    }
  }
}
