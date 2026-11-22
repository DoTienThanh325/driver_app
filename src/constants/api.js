import Constants from 'expo-constants';
import { Platform } from 'react-native';

const GATEWAY_PORT = '8080';

function readHostname(uri) {
  return uri?.trim().match(/^(?:(?:https?|exps?):\/\/)?(\[[\da-f:.]+\]|[^\s:/?#@]+)(?::\d+)?(?:[/?#]|$)/i)?.[1];
}

export function getHostIp() {
  const configuredHost = readHostname(process.env.EXPO_PUBLIC_API_URL);
  if (configuredHost) return configuredHost;

  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? 'localhost' : window.location.hostname || 'localhost';
  }

  const metroHosts = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.linkingUri,
  ];
  for (const uri of metroHosts) {
    const host = readHostname(uri);
    if (host && !['localhost', '127.0.0.1', '[::1]'].includes(host.toLowerCase())) return host;
  }

  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

export function getGatewayUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');

  const protocol = Platform.OS === 'web' && typeof window !== 'undefined' &&
    window.location.protocol === 'https:' ? 'https' : 'http';
  return `${protocol}://${getHostIp()}:${GATEWAY_PORT}`;
}
