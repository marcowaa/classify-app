export interface OTPProvider {
  send(destination: string, code: string): Promise<void>;
}
