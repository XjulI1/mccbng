import {Client, expect} from '@loopback/testlab';
import {ApiLoopbackApplication} from '../..';
import {setupApplication} from './test-helper';

// These acceptance tests only cover auth gating and request-validation paths
// that do not need a live MySQL connection. End-to-end coverage with seeded
// data lives in the integration suite (out of scope for this CI run).
describe('StatsController', () => {
  let app: ApiLoopbackApplication;
  let client: Client;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
  });

  after(async () => {
    await app.stop();
  });

  it('rejects /stats/yearComparison without a token', async () => {
    const res = await client.get('/stats/yearComparison?yearA=2025&yearB=2026');
    expect(res.status).to.equal(401);
  });

  it('rejects /stats/topCategories without a token', async () => {
    const res = await client.get(
      '/stats/topCategories?from=2026-01-01&to=2026-12-31&limit=10',
    );
    expect(res.status).to.equal(401);
  });

  it('rejects /stats/incomeVsExpense without a token', async () => {
    const res = await client.get('/stats/incomeVsExpense?yearNumber=2026');
    expect(res.status).to.equal(401);
  });

  it('rejects /stats/topOperations without a token', async () => {
    const res = await client.get(
      '/stats/topOperations?from=2026-01-01&to=2026-12-31',
    );
    expect(res.status).to.equal(401);
  });

  it('rejects /stats/categoryHeatmap without a token', async () => {
    const res = await client.get('/stats/categoryHeatmap?yearNumber=2026');
    expect(res.status).to.equal(401);
  });
});
