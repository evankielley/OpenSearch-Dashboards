/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@osd/expect';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const docTable = getService('docTable');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'context']);
  const opensearchArchiver = getService('opensearchArchiver');
  const opensearchDashboardsServer = getService('opensearchDashboardsServer');
  const retry = getService('retry');

  describe('doc link in discover', function contextSize() {
    beforeEach(async function () {
      log.debug('load opensearch-dashboards index with default index pattern');
      await opensearchArchiver.loadIfNeeded('discover');

      await opensearchArchiver.loadIfNeeded('logstash_functional');
      await opensearchDashboardsServer.uiSettings.replace({
        'discover:v2': false,
      });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.discover.waitForDocTableLoadingComplete();
    });

    it('should open the doc view of the selected document', async function () {
      // navigate to the doc view
      await docTable.clickRowToggle({ rowIndex: 0 });

      // click the open action
      await retry.try(async () => {
        const rowActions = await docTable.getRowActions({ rowIndex: 0 });
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        await rowActions[1].click();
      });

      const hasDocHit = await testSubjects.exists('doc-hit');
      expect(hasDocHit).to.be(true);
    });

    it('add filter should create an exists filter if value is null (#7189)', async function () {
      await PageObjects.discover.waitUntilSearchingHasFinished();
      // Filter special document
      await filterBar.addFilter('agent', 'is', 'Missing/Fields');
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await retry.try(async () => {
        // navigate to the doc view
        await docTable.clickRowToggle({ rowIndex: 0 });

        const details = await docTable.getDetailsRow();
        await docTable.addInclusiveFilter(details, 'referer');
        await PageObjects.discover.waitUntilSearchingHasFinished();

        const hasInclusiveFilter = await filterBar.hasFilter(
          'referer',
          'exists',
          true,
          false,
          true
        );
        expect(hasInclusiveFilter).to.be(true);

        await docTable.removeInclusiveFilter(details, 'referer');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const hasExcludeFilter = await filterBar.hasFilter('referer', 'exists', true, false, false);
        expect(hasExcludeFilter).to.be(true);
      });
    });
  });
}
