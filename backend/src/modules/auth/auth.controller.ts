import type { Request, Response } from 'express';
import { authService, type AuthService } from './auth.service.js';
import { otpService } from './otp.service.js';
import { AUTH_CONSTANTS, REFRESH_COOKIE_OPTIONS } from './auth.constants.js';
import { sendSuccessResponse, sendCreatedResponse } from '../../utils/response.util.js';

export class AuthController {
  private service: AuthService;

  constructor(service: AuthService = authService) {
    this.service = service;
  }

  public register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.register(req.body);
    sendCreatedResponse(res, result.user, result.message);
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    const userAgent = req.get('user-agent');
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await this.service.login(req.body, userAgent, ipAddress);

    // Set secure httpOnly cookie with refresh token
    res.cookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

    sendSuccessResponse(
      res,
      { user: result.user, accessToken: result.accessToken },
      'Login successful. Welcome back to Cartiva Mini.'
    );
  };

  public refresh = async (req: Request, res: Response): Promise<void> => {
    const rawRefreshToken =
      req.cookies?.[AUTH_CONSTANTS.REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    const userAgent = req.get('user-agent');
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await this.service.refreshToken(rawRefreshToken, userAgent, ipAddress);

    // Rotate refresh token cookie
    res.cookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

    sendSuccessResponse(
      res,
      { user: result.user, accessToken: result.accessToken },
      'Token refreshed successfully.'
    );
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    const rawRefreshToken =
      req.cookies?.[AUTH_CONSTANTS.REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    await this.service.logout(rawRefreshToken);

    // Clear refresh token cookie
    res.clearCookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: REFRESH_COOKIE_OPTIONS.secure,
      sameSite: REFRESH_COOKIE_OPTIONS.sameSite,
      path: '/',
    });

    sendSuccessResponse(res, null, 'Logged out successfully.');
  };

  public logoutAll = async (req: Request, res: Response): Promise<void> => {
    await this.service.logoutAll(req.user!.id);

    res.clearCookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: REFRESH_COOKIE_OPTIONS.secure,
      sameSite: REFRESH_COOKIE_OPTIONS.sameSite,
      path: '/',
    });

    sendSuccessResponse(res, null, 'Logged out from all active sessions successfully.');
  };

  public getMe = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.getMe(req.user!.id);
    sendSuccessResponse(res, user, 'Authenticated user profile retrieved successfully.');
  };

  public verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const { email, otp, purpose } = req.body;
    const result = await otpService.verifyOtp(email, otp, purpose || 'email_verification');
    sendSuccessResponse(res, { userId: result.userId }, result.message);
  };

  public resendVerification = async (req: Request, res: Response): Promise<void> => {
    const { email, purpose } = req.body;
    const result = await otpService.resendOtp(email, purpose || 'email_verification');
    sendSuccessResponse(res, { cooldownSeconds: result.cooldownSeconds }, result.message);
  };

  public forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.forgotPassword(req.body.email);
    sendSuccessResponse(res, null, result.message);
  };

  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.resetPassword(req.body);

    res.clearCookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: REFRESH_COOKIE_OPTIONS.secure,
      sameSite: REFRESH_COOKIE_OPTIONS.sameSite,
      path: '/',
    });

    sendSuccessResponse(res, null, result.message);
  };

  public changePassword = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.changePassword(req.user!.id, req.body);

    res.clearCookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: REFRESH_COOKIE_OPTIONS.secure,
      sameSite: REFRESH_COOKIE_OPTIONS.sameSite,
      path: '/',
    });

    sendSuccessResponse(res, null, result.message);
  };

  public getSessions = async (req: Request, res: Response): Promise<void> => {
    const sessions = await this.service.getUserSessions(req.user!.id, req.sessionId);
    sendSuccessResponse(res, sessions, 'Active user sessions retrieved successfully.');
  };

  public revokeSession = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.revokeUserSession(req.user!.id, req.params.id as string);
    sendSuccessResponse(res, null, result.message);
  };

  public verifyOtp = async (req: Request, res: Response): Promise<void> => {
    const { email, otp, purpose } = req.body;
    const result = await otpService.verifyOtp(email, otp, purpose || 'email_verification');
    sendSuccessResponse(res, { userId: result.userId }, result.message);
  };

  public resendOtp = async (req: Request, res: Response): Promise<void> => {
    const { email, purpose } = req.body;
    const result = await otpService.resendOtp(email, purpose || 'email_verification');
    sendSuccessResponse(res, { cooldownSeconds: result.cooldownSeconds }, result.message);
  };
}

export const authController = new AuthController();
