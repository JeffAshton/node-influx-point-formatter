/* eslint-disable @typescript-eslint/unified-signatures */
/* eslint-disable no-dupe-class-members */

import * as grammar from './grammar';
import {coerceBadly, ISchemaOptions, Schema} from './schema';

const defaultOptions: IPointFormatterOptions = Object.freeze({
	schema: []
});

export interface IPointFormatterOptions {

	/**
	* A list of schema for measurements in the database.
	*/
	schema?: ISchemaOptions[];
}

export interface IFormatOptions {

	/**
	* Precision at which the points are written, defaults to nanoseconds 'n'.
	*/
	precision?: grammar.TimePrecision;
}

export interface IPoint {
	/**
	* Measurement is the Influx measurement name.
	*/
	measurement?: string;

	/**
	* Tags is the list of tag values to insert.
	*/
	tags?: { [name: string]: string };

	/**
	* Fields is the list of field values to insert.
	*/
	fields?: { [name: string]: any };

	/**
	* Timestamp tags this measurement with a date. This can be a Date object,
	* in which case we'll adjust it to the desired precision, or a numeric
	* string or number, in which case it gets passed directly to Influx.
	*/
	timestamp?: Date | string | number;
}

/**
 * Works similarly to Object.assign, but only overwrites
 * properties that resolve to undefined.
 */
function defaults<T>(target: T, ...srcs: T[]): T {
	srcs.forEach(src => {
		Object.keys(src).forEach((key: Extract<keyof T, string>) => {
			if (target[key] === undefined) {
				target[key] = src[key];
			}
		});
	});

	return target;
}

export class PointFormatter {
	/**
	* Config options for Influx.
	* @private
	*/
	private _options: IPointFormatterOptions;

	/**
	* Map of Schema instances defining measurements in Influx.
	* @private
	*/
	private _schema: { [measurement: string]: Schema } = Object.create(null);

	/**
	 * Creates a formatter with the default options.
	 */
	constructor();

	/**
	* Creates a formatter with custom options.
	*/
	constructor(options: IPointFormatterOptions);

	constructor(options?: any) {
		const resolved = options as IPointFormatterOptions;
		this._options = defaults(resolved, defaultOptions);
		this._options.schema.forEach(schema => this._createSchema(schema));
	}

	/**
	* Adds specified schema for better fields coercing.
	*
	* @param {ISchemaOptions} schema
	* @memberof PointFormatter
	*/
	public addSchema(schema: ISchemaOptions): void {
		this._createSchema(schema);
	}

	/**
	 * Formats a point in the  InfluxDB line protocol format.
	 * @param point
	 * @param options
	 */
	public formatPoint(point: IPoint, options: IFormatOptions): string {
		const {
			precision = 'n' as grammar.TimePrecision
		} = options;

		const {fields = {}, tags = {}, measurement, timestamp} = point;

		const schema = this._schema[measurement];
		const fieldsPairs = schema ? schema.coerceFields(fields) : coerceBadly(fields);
		const tagsNames = schema ? schema.checkTags(tags) : Object.keys(tags);

		let payload = measurement;

		for (let tagsName of tagsNames) {
			payload += ',' + grammar.escape.tag(tagsName) + '=' + grammar.escape.tag(tags[tagsName]);
		}

		for (let i = 0; i < fieldsPairs.length; i += 1) {
			payload +=
		(i === 0 ? ' ' : ',') + grammar.escape.tag(fieldsPairs[i][0]) + '=' + fieldsPairs[i][1];
		}

		if (timestamp !== undefined) {
			payload += ' ' + grammar.castTimestamp(timestamp, precision);
		}

		return payload;
	}

	/**
	* Creates specified measurement schema
	*
	* @private
	* @param {ISchemaOptions} schema
	* @memberof PointFormatter
	*/
	private _createSchema(schema: ISchemaOptions): void {
		this._schema[schema.measurement] = new Schema(schema);
	}
}
