import { IsIn, IsString, Matches, MaxLength } from 'class-validator';

export const DEVICE_PLATFORMS = ['android', 'ios'] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

/** Formato de Expo Push: `ExponentPushToken[...]` (o `ExpoPushToken[...]`). */
export const EXPO_PUSH_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;

export class RegisterDeviceDto {
  @IsString()
  @MaxLength(255)
  @Matches(EXPO_PUSH_TOKEN, {
    message: 'El token de notificaciones no es válido.',
  })
  token: string;

  @IsIn(DEVICE_PLATFORMS, { message: 'La plataforma debe ser android o ios.' })
  platform: DevicePlatform;
}
