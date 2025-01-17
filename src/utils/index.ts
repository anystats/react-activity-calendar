import type { Day as WeekDay } from 'date-fns';
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  formatISO,
  getDay,
  getMonth,
  nextDay,
  parseISO,
  subWeeks,
} from 'date-fns';

import { DEFAULT_MONTH_LABELS, MIN_DISTANCE_MONTH_LABELS, NAMESPACE } from '../constants';
import { Activity, Week } from '../types';

interface Label {
  x: number;
  y: number;
  text: string;
}

export function groupByWeeks(
  days: Array<Activity>,
  weekStart: WeekDay = 0, // 0 = Sunday
): Array<Week> {
  if (days.length === 0) {
    return [];
  }

  const normalizedDays = fillHoles(days);

  // Determine the first date of the calendar. If the first date is not the
  // set start weekday, the selected weekday one week earlier is used.
  const firstDate = parseISO(normalizedDays[0].date);
  const firstCalendarDate =
    getDay(firstDate) === weekStart ? firstDate : subWeeks(nextDay(firstDate, weekStart), 1);

  // To correctly group activities by week, it is necessary to left pad the
  // list because the first date might not be set start weekday.
  const paddedDays = [
    ...Array(differenceInCalendarDays(firstDate, firstCalendarDate)).fill(undefined),
    ...normalizedDays,
  ];

  return Array(Math.ceil(paddedDays.length / 7))
    .fill(undefined)
    .map((_, calendarWeek) => paddedDays.slice(calendarWeek * 7, calendarWeek * 7 + 7));
}

/**
 * The calendar expects a continuous sequence of days, so fill gaps with empty
 * activity data.
 */
function fillHoles(days: Array<Activity>): Array<Activity> {
  const daysMap = days.reduce((map, day) => {
    map.set(day.date, day);
    return map;
  }, new Map<string, Activity>());

  return eachDayOfInterval({
    start: parseISO(days[0].date),
    end: parseISO(days[days.length - 1].date),
  }).map(day => {
    const date = formatISO(day, { representation: 'date' });

    if (daysMap.has(date)) {
      return daysMap.get(date) as Activity;
    }

    return {
      date,
      count: 0,
      level: 0,
    };
  });
}

export function getMonthLabels(
  weeks: Array<Week>,
  monthNames: Array<string> = DEFAULT_MONTH_LABELS,
): Array<Label> {
  return weeks
    .reduce<Array<Label>>((labels, week, index) => {
      const firstWeekDay = week.find(day => day !== undefined);

      if (!firstWeekDay) {
        throw new Error(`Unexpected error: Week is empty: [${week}].`);
      }

      const month = monthNames[getMonth(parseISO(firstWeekDay.date))];
      const prev = labels[labels.length - 1];

      if (index === 0 || prev.text !== month) {
        return [
          ...labels,
          {
            x: index,
            y: 0,
            text: month,
          },
        ];
      }

      return labels;
    }, [])
    .filter((label, index, labels) => {
      if (index === 0) {
        return labels[1] && labels[1].x - label.x > MIN_DISTANCE_MONTH_LABELS;
      }

      return true;
    });
}

export function getClassName(name: string, styles?: string): string {
  if (styles) {
    return `${NAMESPACE}__${name} ${styles}`;
  }

  return `${NAMESPACE}__${name}`;
}

export function generateEmptyData(): Array<Activity> {
  const year = new Date().getFullYear();
  const days = eachDayOfInterval({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
  });

  return days.map(date => ({
    date: formatISO(date, { representation: 'date' }),
    count: 0,
    level: 0,
  }));
}
