/**
 * Lightweight ICS / iCal parser.
 *
 * Handles the subset of RFC 5545 that covers the vast majority of real-world
 * calendar feeds:
 *   - Line unfolding (CRLF + SP/TAB continuation)
 *   - VEVENT extraction
 *   - DTSTART / DTEND — DATE (all-day) and DATE-TIME (local, UTC, TZID)
 *   - SUMMARY, DESCRIPTION, UID
 *
 * Deliberate omissions (lightweight scope):
 *   - RRULE / recurring events — only the base occurrence is captured
 *   - VTIMEZONE blocks — TZID offsets are ignored; times are treated as local
 *   - VALARM, VFREEBUSY, VTODO
 */

import { moment } from "obsidian";
import type { CalendarEvent } from "./types";

// ── Line unfolding ─────────────────────────────────────────────────────────────

function unfold(raw: string): string {
	// RFC 5545 §3.1: long content lines are folded with CRLF + (SP | HTAB).
	// Also handle bare LF just in case.
	return raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

// ── Property line parsing ──────────────────────────────────────────────────────

interface ICSProp {
	name: string;
	/** Raw parameter string, e.g. "TZID=America/New_York;VALUE=DATE-TIME" */
	params: string;
	value: string;
}

function parsePropLine(line: string): ICSProp | null {
	const colonIdx = line.indexOf(":");
	if (colonIdx === -1) return null;

	const nameAndParams = line.slice(0, colonIdx);
	const value = line.slice(colonIdx + 1);

	const semicolonIdx = nameAndParams.indexOf(";");
	const name = semicolonIdx === -1
		? nameAndParams.toUpperCase()
		: nameAndParams.slice(0, semicolonIdx).toUpperCase();
	const params = semicolonIdx === -1 ? "" : nameAndParams.slice(semicolonIdx + 1);

	return { name, params, value };
}

// ── Date/time parsing ──────────────────────────────────────────────────────────

/**
 * Returns { m: Moment, allDay: boolean } for an ICS DTSTART / DTEND value.
 *
 * Formats handled:
 *   - DATE           : 20240528
 *   - DATE-TIME UTC  : 20240528T140000Z
 *   - DATE-TIME local: 20240528T140000
 *   - DATE-TIME TZID : 20240528T140000  (params contains TZID=...; we ignore the tz offset)
 */
function parseDateTime(
	value: string,
	params: string
): { m: ReturnType<typeof moment>; allDay: boolean } | null {
	const isDate = /^VALUE=DATE(?!-TIME)/.test(params) || /^\d{8}$/.test(value.trim());

	if (isDate) {
		const m = moment(value.trim(), "YYYYMMDD", true);
		return m.isValid() ? { m, allDay: true } : null;
	}

	const trimmed = value.trim();

	if (trimmed.endsWith("Z")) {
		// UTC — convert to local
		const m = moment.utc(trimmed.slice(0, -1), "YYYYMMDDTHHmmss", true).local();
		return m.isValid() ? { m, allDay: false } : null;
	}

	// Local or TZID (we approximate TZID as local)
	const m = moment(trimmed, "YYYYMMDDTHHmmss", true);
	return m.isValid() ? { m, allDay: false } : null;
}

// ── VEVENT block parsing ───────────────────────────────────────────────────────

function parseVEvent(
	block: string,
	sourceId: string,
	sourceColor: string
): CalendarEvent | null {
	const lines = block.split(/\r?\n/).filter((l) => l.trim());

	let uid = "";
	let summary = "";
	let description: string | undefined;
	let start: ReturnType<typeof moment> | null = null;
	let end: ReturnType<typeof moment> | null = null;
	let allDay = false;

	for (const line of lines) {
		const prop = parsePropLine(line);
		if (!prop) continue;

		switch (prop.name) {
			case "UID":
				uid = prop.value;
				break;
			case "SUMMARY":
				summary = unescapeICS(prop.value);
				break;
			case "DESCRIPTION":
				description = unescapeICS(prop.value);
				break;
			case "DTSTART": {
				const parsed = parseDateTime(prop.value, prop.params);
				if (parsed) {
					start = parsed.m;
					allDay = parsed.allDay;
				}
				break;
			}
			case "DTEND": {
				const parsed = parseDateTime(prop.value, prop.params);
				if (parsed) end = parsed.m;
				break;
			}
		}
	}

	if (!start || !summary) return null;

	return {
		uid: uid || `${sourceId}::${summary}::${start.toISOString()}`,
		summary,
		start,
		end,
		allDay,
		description: description || undefined,
		sourceId,
		sourceColor,
	};
}

// ── ICS text escape sequences ──────────────────────────────────────────────────

function unescapeICS(value: string): string {
	return value
		.replace(/\\n/g, "\n")
		.replace(/\\N/g, "\n")
		.replace(/\\,/g, ",")
		.replace(/\\;/g, ";")
		.replace(/\\\\/g, "\\");
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Parse a full ICS document and return all VEVENT entries as CalendarEvents.
 */
export function parseICS(
	raw: string,
	sourceId: string,
	sourceColor: string
): CalendarEvent[] {
	const text = unfold(raw);
	const events: CalendarEvent[] = [];

	// Extract each VEVENT block
	const blockRE = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
	let match: RegExpExecArray | null;
	while ((match = blockRE.exec(text)) !== null) {
		const evt = parseVEvent(match[1], sourceId, sourceColor);
		if (evt) events.push(evt);
	}

	return events;
}

// ── Date matching ──────────────────────────────────────────────────────────────

/**
 * Returns true if a CalendarEvent falls (fully or partially) on the given calendar day.
 */
export function isEventOnDate(
	event: CalendarEvent,
	date: ReturnType<typeof moment>
): boolean {
	const dayStart = date.clone().startOf("day");
	const dayEnd = date.clone().endOf("day");

	if (event.allDay) {
		// All-day end is exclusive in ICS (end = next day), so we use isSameOrAfter dayStart.
		const evtEnd = event.end ?? event.start.clone().add(1, "day");
		return event.start.isBefore(dayEnd) && evtEnd.isAfter(dayStart);
	}

	const evtEnd = event.end ?? event.start.clone().add(1, "hour");
	return event.start.isBefore(dayEnd) && evtEnd.isAfter(dayStart);
}
