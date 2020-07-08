/* eslint-disable @typescript-eslint/camelcase */
/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions */
/* eslint max-nested-callbacks: ["error", 5] */

import {expect} from 'chai';

import {FieldType, PointFormatter, toNanoDate} from '../../src';

describe('PointFormatter', () => {
	describe('constructor', () => {
		it('uses default options', () => {
			expect((new PointFormatter() as any)._options).to.deep.equal({
				schema: []
			});
		});

		it('parses parses schema', () => {
			let client = new PointFormatter({
				schema: [
					{
						measurement: 'my_measurement',
						fields: {},
						tags: ['my_tag']
					}
				]
			}) as any;

			expect(client._schema.my_measurement).to.not.be.undefined;
		});
	});

	describe('methods', () => {
		let formatter: PointFormatter;
		beforeEach(() => {
			formatter = new PointFormatter({
				schema: [
					{
						measurement: 'my_schemed_measure',
						tags: ['my_tag'],
						fields: {
							int: FieldType.INTEGER,
							float: FieldType.FLOAT,
							string: FieldType.STRING,
							bool: FieldType.BOOLEAN
						}
					}
				]
			});
		});

		describe('.formatPoint()', () => {
			it('formats with all options specified without a schema', () => {
				const point = formatter.formatPoint(
					{
						measurement: 'mymeas',
						tags: {my_tag: '1'},
						fields: {myfield: 90},
						timestamp: new Date(1463683075000)
					},
					{
						precision: 's'
					}
				);
				expect(point).to.equal('mymeas,my_tag=1 myfield=90 1463683075');
			});

			it('formats using default options without a schema', () => {
				const point = formatter.formatPoint(
					{
						measurement: 'mymeas',
						tags: {my_tag: '1'},
						fields: {myfield: 90},
						timestamp: new Date(1463683075000)
					}
				);
				expect(point).to.equal('mymeas,my_tag=1 myfield=90 1463683075000000000');
			});

			it('uses a schema to coerce', () => {
				const point = formatter.formatPoint(
					{
						measurement: 'my_schemed_measure',
						tags: {my_tag: '1'},
						fields: {
							int: 42,
							float: 43,
							bool: true
						}
					}
				);
				expect(point).to.equal('my_schemed_measure,my_tag=1 bool=T,float=43,int=42i');
			});

			it('can accept a schema at runtime', () => {
				formatter.addSchema({
					measurement: 'my_runtime_schema_measure',
					fields: {
						bool: FieldType.BOOLEAN,
						float: FieldType.FLOAT,
						int: FieldType.INTEGER
					},
					tags: ['my_tag']
				});
				const point = formatter.formatPoint(
					{
						measurement: 'my_runtime_schema_measure',
						tags: {my_tag: '1'},
						fields: {
							int: 42,
							float: 43,
							bool: true
						}
					}
				);
				expect(point).to.equal('my_runtime_schema_measure,my_tag=1 bool=T,float=43,int=42i');
			});

			it('throws on schema violations', () => {
				expect(() => {
					formatter.formatPoint(
						{
							measurement: 'my_schemed_measure',
							tags: {notATag: '1'}
						}
					);
				}).to.throw(/extraneous tags/i);

				expect(() => {
					formatter.formatPoint(
						{
							measurement: 'my_schemed_measure',
							fields: {notAField: '1'}
						}
					);
				}).to.throw(/extraneous fields/i);

				expect(() => {
					formatter.formatPoint(
						{
							measurement: 'my_schemed_measure',
							fields: {bool: 'lol, not a bool'}
						}
					);
				}).to.throw(/expected bool/i);
			});

			it('handles lack of tags', () => {
				const point = formatter.formatPoint(
					{
						measurement: 'mymeas',
						fields: {myfield: 90}
					}
				);
				expect(point).to.equal('mymeas myfield=90');
			});

			it('handles lack of fields', () => {
				const point = formatter.formatPoint(
					{
						measurement: 'mymeas',
						tags: {my_tag: '90'}
					}
				);
				expect(point).to.equal('mymeas,my_tag=90');
			});

			it('handles multiple tags', () => {
				const point = formatter.formatPoint(
					{
						measurement: 'mymeas',
						tags: {my_tag1: '90', my_tag2: '45'}
					}
				);
				expect(point).to.equal('mymeas,my_tag1=90,my_tag2=45');
			});

			it('accepts nanoseconds (as ms)', () => {
				const point = formatter.formatPoint(
					{
						measurement: 'mymeas',
						tags: {my_tag: '1'},
						fields: {myfield: 90},
						timestamp: toNanoDate('1463683075000000000')
					},
				);
				expect(point).to.equal('mymeas,my_tag=1 myfield=90 1463683075000000000');
			});

			it('accepts timestamp overriding', () => {
				const point = formatter.formatPoint(
					{
						measurement: 'mymeas',
						tags: {my_tag: '1'},
						fields: {myfield: 90},
						timestamp: toNanoDate('1463683075000000000')
					},
					{precision: 'ms'}
				);
				expect(point).to.equal('mymeas,my_tag=1 myfield=90 1463683075000');
			});
		});
	});
});
