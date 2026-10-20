import { IsIn, IsString, Matches, MaxLength } from 'class-validator';

// Formato de los tokens de Expo: ExponentPushToken[xxxx] (o el alias ExpoPushToken[xxxx]).
export const EXPO_PUSH_TOKEN_REGEX =
  /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/;

export const DEVICE_PLATFORMS = ['android', 'ios'] as const;

export class RegisterDeviceDto {
  @IsString()
  @MaxLength(255)
  @Matches(EXPO_PUSH_TOKEN_REGEX, {
    message: 'token de notificaciones inválido',
  })
  token!: string;

  @IsIn(DEVICE_PLATFORMS)
  platform!: (typeof DEVICE_PLATFORMS)[number];
}

export class UnregisterDeviceDto {
  @IsString()
  @MaxLength(255)
  @Matches(EXPO_PUSH_TOKEN_REGEX, {
    message: 'token de notificaciones inválido',
  })
  token!: string;
}
