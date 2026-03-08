import axios, {AxiosInstance} from 'axios';

const GOCARDLESS_BASE_URL =
  'https://bankaccountdata.gocardless.com/api/v2';

export interface GoCardlessTokens {
  access: string;
  access_expires: number;
  refresh: string;
  refresh_expires: number;
}

export interface GoCardlessInstitution {
  id: string;
  name: string;
  bic: string;
  transaction_total_days: string;
  countries: string[];
  logo: string;
}

export interface GoCardlessRequisitionResponse {
  id: string;
  status: string;
  link: string;
  accounts: string[];
  institution_id: string;
}

export interface GoCardlessAccountDetails {
  iban?: string;
  name?: string;
  ownerName?: string;
  currency?: string;
}

export interface GoCardlessTransaction {
  transactionId?: string;
  internalTransactionId?: string;
  bookingDate: string;
  valueDate?: string;
  transactionAmount: {
    currency: string;
    amount: string;
  };
  debtorName?: string;
  creditorName?: string;
  remittanceInformationUnstructured?: string;
  remittanceInformationUnstructuredArray?: string[];
  bankTransactionCode?: string;
}

export interface GoCardlessTransactionsResponse {
  transactions: {
    booked: GoCardlessTransaction[];
    pending: GoCardlessTransaction[];
  };
}

export class GoCardlessService {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private secretId: string,
    private secretKey: string,
  ) {
    this.client = axios.create({
      baseURL: GOCARDLESS_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  private async ensureAuthenticated(): Promise<void> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt) {
      return;
    }

    if (this.refreshToken) {
      try {
        const response = await this.client.post('/token/refresh/', {
          refresh: this.refreshToken,
        });
        this.accessToken = response.data.access;
        this.tokenExpiresAt =
          now + response.data.access_expires * 1000 - 60000;
        return;
      } catch {
        // Refresh failed, get new tokens
      }
    }

    const response = await this.client.post('/token/new/', {
      secret_id: this.secretId,
      secret_key: this.secretKey,
    });

    const tokens: GoCardlessTokens = response.data;
    this.accessToken = tokens.access;
    this.refreshToken = tokens.refresh;
    this.tokenExpiresAt = now + tokens.access_expires * 1000 - 60000;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    await this.ensureAuthenticated();
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  async getInstitutions(
    country: string,
  ): Promise<GoCardlessInstitution[]> {
    const headers = await this.authHeaders();
    const response = await this.client.get('/institutions/', {
      headers,
      params: {country},
    });
    return response.data;
  }

  async createRequisition(
    institutionId: string,
    redirectUrl: string,
  ): Promise<GoCardlessRequisitionResponse> {
    const headers = await this.authHeaders();
    const response = await this.client.post(
      '/requisitions/',
      {
        redirect: redirectUrl,
        institution_id: institutionId,
      },
      {headers},
    );
    return response.data;
  }

  async getRequisition(
    requisitionId: string,
  ): Promise<GoCardlessRequisitionResponse> {
    const headers = await this.authHeaders();
    const response = await this.client.get(
      `/requisitions/${requisitionId}/`,
      {headers},
    );
    return response.data;
  }

  async deleteRequisition(requisitionId: string): Promise<void> {
    const headers = await this.authHeaders();
    await this.client.delete(`/requisitions/${requisitionId}/`, {headers});
  }

  async getAccountDetails(
    accountId: string,
  ): Promise<GoCardlessAccountDetails> {
    const headers = await this.authHeaders();
    const response = await this.client.get(
      `/accounts/${accountId}/details/`,
      {headers},
    );
    return response.data.account;
  }

  async getAccountBalances(
    accountId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    const headers = await this.authHeaders();
    const response = await this.client.get(
      `/accounts/${accountId}/balances/`,
      {headers},
    );
    return response.data.balances;
  }

  async getTransactions(
    accountId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<GoCardlessTransactionsResponse> {
    const headers = await this.authHeaders();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    const response = await this.client.get(
      `/accounts/${accountId}/transactions/`,
      {headers, params},
    );
    return response.data;
  }
}
