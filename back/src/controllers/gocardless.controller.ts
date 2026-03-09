import {repository, AnyObject} from '@loopback/repository';
import {
  post,
  param,
  get,
  del,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {
  GoCardlessRequisitionRepository,
  GoCardlessAccountRepository,
  OperationRepository,
} from '../repositories';
import {
  GoCardlessService,
  GoCardlessTransaction,
} from '../services/gocardless.service';

@authenticate('jwt')
export class GoCardlessController {
  private gcService: GoCardlessService | null = null;

  constructor(
    @repository(GoCardlessRequisitionRepository)
    public requisitionRepository: GoCardlessRequisitionRepository,
    @repository(GoCardlessAccountRepository)
    public gcAccountRepository: GoCardlessAccountRepository,
    @repository(OperationRepository)
    public operationRepository: OperationRepository,
  ) {}

  private getService(): GoCardlessService {
    if (!this.gcService) {
      const secretId = process.env.GOCARDLESS_SECRET_ID;
      const secretKey = process.env.GOCARDLESS_SECRET_KEY;
      if (!secretId || !secretKey) {
        throw new HttpErrors.ServiceUnavailable(
          'GoCardless credentials not configured. Set GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY environment variables.',
        );
      }
      this.gcService = new GoCardlessService(secretId, secretKey);
    }
    return this.gcService;
  }

  @get('/gocardless/institutions', {
    responses: {
      '200': {
        description: 'List of banking institutions for a country',
      },
    },
  })
  async getInstitutions(
    @param.query.string('country') country: string = 'fr',
  ): Promise<AnyObject[]> {
    const service = this.getService();
    return service.getInstitutions(country);
  }

  @post('/gocardless/requisitions', {
    responses: {
      '200': {
        description: 'Created requisition with bank auth link',
      },
    },
  })
  async createRequisition(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['institutionId', 'redirectUrl'],
            properties: {
              institutionId: {type: 'string'},
              redirectUrl: {type: 'string'},
            },
          },
        },
      },
    })
    body: {
      institutionId: string;
      redirectUrl: string;
    },
  ): Promise<AnyObject> {
    const service = this.getService();
    const userID = Number(currentUserProfile[securityId]);

    const result = await service.createRequisition(
      body.institutionId,
      body.redirectUrl,
    );

    await this.requisitionRepository.create({
      requisitionId: result.id,
      institutionId: body.institutionId,
      status: result.status,
      link: result.link,
      IDuser: userID,
      createdAt: new Date().toISOString(),
    });

    return {
      requisitionId: result.id,
      link: result.link,
      status: result.status,
    };
  }

  @get('/gocardless/requisitions', {
    responses: {
      '200': {
        description: 'List of user requisitions',
      },
    },
  })
  async listRequisitions(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<AnyObject[]> {
    const userID = Number(currentUserProfile[securityId]);
    return this.requisitionRepository.find({
      where: {IDuser: userID},
    });
  }

  @get('/gocardless/requisitions/{requisitionId}/status', {
    responses: {
      '200': {
        description: 'Requisition status and discovered accounts',
      },
    },
  })
  async getRequisitionStatus(
    @param.path.string('requisitionId') requisitionId: string,
  ): Promise<AnyObject> {
    const service = this.getService();
    const result = await service.getRequisition(requisitionId);

    // Update local status
    await this.requisitionRepository.updateAll(
      {status: result.status},
      {requisitionId},
    );

    // If linked (LN), fetch account details
    const accounts = [];
    if (result.status === 'LN' && result.accounts) {
      for (const accountId of result.accounts) {
        try {
          const details = await service.getAccountDetails(accountId);
          accounts.push({
            accountId,
            iban: details.iban,
            name: details.name || details.ownerName,
          });
        } catch {
          accounts.push({accountId, iban: null, name: null});
        }
      }
    }

    return {
      requisitionId: result.id,
      status: result.status,
      institutionId: result.institution_id,
      accounts,
    };
  }

  @del('/gocardless/requisitions/{requisitionId}', {
    responses: {
      '204': {
        description: 'Requisition deleted',
      },
    },
  })
  async deleteRequisition(
    @param.path.string('requisitionId') requisitionId: string,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<void> {
    const userID = Number(currentUserProfile[securityId]);

    // Delete linked accounts
    await this.gcAccountRepository.deleteAll({requisitionId, IDuser: userID});

    // Delete local requisition
    await this.requisitionRepository.deleteAll({requisitionId, IDuser: userID});

    // Try to delete on GoCardless side
    try {
      const service = this.getService();
      await service.deleteRequisition(requisitionId);
    } catch {
      // Ignore - requisition may already be expired
    }
  }

  @post('/gocardless/accounts/link', {
    responses: {
      '200': {
        description: 'GoCardless account linked to local account',
      },
    },
  })
  async linkAccount(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['accountId', 'IDcompte', 'requisitionId'],
            properties: {
              accountId: {type: 'string'},
              IDcompte: {type: 'number'},
              requisitionId: {type: 'string'},
              iban: {type: 'string'},
              institutionId: {type: 'string'},
            },
          },
        },
      },
    })
    body: {
      accountId: string;
      IDcompte: number;
      requisitionId: string;
      iban?: string;
      institutionId?: string;
    },
  ): Promise<AnyObject> {
    const userID = Number(currentUserProfile[securityId]);

    // Check if this GC account is already linked
    const existing = await this.gcAccountRepository.findOne({
      where: {accountId: body.accountId, IDuser: userID},
    });

    if (existing) {
      // Update existing link
      await this.gcAccountRepository.updateById(existing.id, {
        IDcompte: body.IDcompte,
        requisitionId: body.requisitionId,
        iban: body.iban,
        institutionId: body.institutionId,
      });
      return {...existing, IDcompte: body.IDcompte};
    }

    return this.gcAccountRepository.create({
      accountId: body.accountId,
      IDcompte: body.IDcompte,
      requisitionId: body.requisitionId,
      iban: body.iban,
      institutionId: body.institutionId,
      IDuser: userID,
    });
  }

  @get('/gocardless/accounts', {
    responses: {
      '200': {
        description: 'List of linked GoCardless accounts',
      },
    },
  })
  async listLinkedAccounts(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<AnyObject[]> {
    const userID = Number(currentUserProfile[securityId]);
    return this.gcAccountRepository.find({
      where: {IDuser: userID},
    });
  }

  @del('/gocardless/accounts/{id}', {
    responses: {
      '204': {
        description: 'GoCardless account link deleted',
      },
    },
  })
  async unlinkAccount(
    @param.path.number('id') id: number,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<void> {
    const userID = Number(currentUserProfile[securityId]);
    const account = await this.gcAccountRepository.findOne({
      where: {id, IDuser: userID},
    });
    if (!account) {
      throw new HttpErrors.NotFound('Linked account not found');
    }
    await this.gcAccountRepository.deleteById(id);
  }

  @post('/gocardless/sync/{IDcompte}', {
    responses: {
      '200': {
        description: 'Sync result with imported transactions count',
      },
    },
  })
  async syncTransactions(
    @param.path.number('IDcompte') IDcompte: number,
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<AnyObject> {
    const userID = Number(currentUserProfile[securityId]);
    const service = this.getService();

    // Find linked GC account
    const gcAccount = await this.gcAccountRepository.findOne({
      where: {IDcompte, IDuser: userID},
    });

    if (!gcAccount) {
      throw new HttpErrors.NotFound(
        'No GoCardless account linked to this compte',
      );
    }

    // Determine date range: from last sync or last 90 days
    const dateFrom = gcAccount.lastSync
      ? new Date(gcAccount.lastSync).toISOString().split('T')[0]
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

    const dateTo = new Date().toISOString().split('T')[0];

    // Fetch transactions from GoCardless
    const transactionsData = await service.getTransactions(
      gcAccount.accountId,
      dateFrom,
      dateTo,
    );

    const bookedTransactions = transactionsData.transactions.booked || [];

    // Import new transactions (avoid duplicates)
    let imported = 0;
    let skipped = 0;

    for (const tx of bookedTransactions) {
      const name = this.extractTransactionName(tx);
      const amount = parseFloat(tx.transactionAmount.amount);
      const date = tx.bookingDate;

      // Check for duplicate: same name, amount, date, and account
      const existing = await this.operationRepository.find({
        where: {
          IDcompte,
          NomOp: name,
          MontantOp: amount,
          DateOp: date,
        },
        limit: 1,
      });

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await this.operationRepository.create({
        NomOp: name,
        MontantOp: amount,
        DateOp: date,
        CheckOp: true, // Bank transactions are already validated
        IDcompte,
        IDcat: 0,
      });
      imported++;
    }

    // Update last sync date
    await this.gcAccountRepository.updateById(gcAccount.id!, {
      lastSync: new Date().toISOString(),
    });

    return {
      imported,
      skipped,
      total: bookedTransactions.length,
      dateFrom,
      dateTo,
    };
  }

  @get('/gocardless/config/status', {
    responses: {
      '200': {
        description: 'GoCardless configuration status',
      },
    },
  })
  async getConfigStatus(): Promise<AnyObject> {
    const configured = !!(
      process.env.GOCARDLESS_SECRET_ID && process.env.GOCARDLESS_SECRET_KEY
    );
    return {configured};
  }

  private extractTransactionName(tx: GoCardlessTransaction): string {
    // Try different fields for the transaction description
    if (tx.remittanceInformationUnstructured) {
      return tx.remittanceInformationUnstructured.trim();
    }
    if (
      tx.remittanceInformationUnstructuredArray &&
      tx.remittanceInformationUnstructuredArray.length > 0
    ) {
      return tx.remittanceInformationUnstructuredArray.join(' ').trim();
    }
    if (tx.creditorName) {
      return tx.creditorName;
    }
    if (tx.debtorName) {
      return tx.debtorName;
    }
    return 'Transaction GoCardless';
  }
}
