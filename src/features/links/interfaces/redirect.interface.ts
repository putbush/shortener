export interface IRedirectService {
  resolve(code: string): Promise<string>;
}
