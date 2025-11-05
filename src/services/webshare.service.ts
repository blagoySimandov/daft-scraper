import axios from "axios";
import { log } from "apify";

interface WebshareProxy {
  id: string;
  username: string;
  password: string;
  proxy_address: string;
  port: number;
  country_code: string;
}

interface WebshareResponse {
  count: number;
  results: WebshareProxy[];
}

export class WebshareService {
  private static apiToken: string;
  private static apiUrl = "https://proxy.webshare.io/api/v2/proxy/list/";

  static setApiToken(token: string): void {
    this.apiToken = token;
  }

  static async getRandomProxy(): Promise<string> {
    try {
      const response = await axios.get<WebshareResponse>(this.apiUrl, {
        headers: {
          Authorization: `Token ${this.apiToken}`,
        },
        params: {
          mode: 'direct',
          page: 1,
          page_size: 25
        }
      });

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error("No proxies available from Webshare");
      }

      const proxies = response.data.results;
      const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];

      const proxyUrl = `http://${randomProxy.username}:${randomProxy.password}@${randomProxy.proxy_address}:${randomProxy.port}`;

      log.debug(`Selected random proxy: ${randomProxy.proxy_address}:${randomProxy.port} (${randomProxy.country_code})`);

      return proxyUrl;
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMsg = typeof errorData === 'string'
        ? errorData
        : (errorData?.detail || JSON.stringify(errorData) || error.message);
      log.error(`Webshare API error: ${errorMsg}`, {
        status: error.response?.status,
        token: this.apiToken ? 'present' : 'missing',
        fullError: errorData
      });
      throw new Error(`Failed to get proxy from Webshare: ${errorMsg}`);
    }
  }
}
