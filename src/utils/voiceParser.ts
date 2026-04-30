import { addDays, format, nextDay, Day } from 'date-fns';

interface ParsedReminder {
  title: string;
  date: string;
  hour: number;
  minute: number;
}

const POLISH_DAYS: Record<string, Day> = {
  poniedziałek: 1,
  wtorek: 2,
  środa: 3,
  czwartek: 4,
  piątek: 5,
  sobota: 6,
  niedziela: 0,
};

export const parseVoiceReminder = (text: string): ParsedReminder => {
  let lowerText = text.toLowerCase().trim();
  const now = new Date();
  let resultDate = now;
  let resultHour = 10;
  let resultMinute = 0;

  // 1. Parse Date
  if (lowerText.includes('pojutrze')) {
    resultDate = addDays(now, 2);
    lowerText = lowerText.replace('pojutrze', '');
  } else if (lowerText.includes('jutro')) {
    resultDate = addDays(now, 1);
    lowerText = lowerText.replace('jutro', '');
  } else if (lowerText.includes('dzisiaj') || lowerText.includes('dziś')) {
    resultDate = now;
    lowerText = lowerText.replace(/dzisiaj|dziś/g, '');
  } else {
    // Check days of week
    for (const [dayName, dayIndex] of Object.entries(POLISH_DAYS)) {
      if (lowerText.includes(dayName)) {
        resultDate = nextDay(now, dayIndex);
        lowerText = lowerText.replace(dayName, '');
        break;
      }
    }
  }

  // 2. Parse Time (e.g., "o 15:30", "godzina 10", "15 30")
  const timeRegex = /(?:o\s*|godzin(?:ie|a)\s*)?(\d{1,2})(?::|\s+)?(\d{2})?/;
  const timeMatch = lowerText.match(timeRegex);

  if (timeMatch) {
    resultHour = parseInt(timeMatch[1], 10);
    if (timeMatch[2]) {
      resultMinute = parseInt(timeMatch[2], 10);
    }
    lowerText = lowerText.replace(timeMatch[0], '');
  }

  // Handle "rano" / "wieczorem" if no specific hour was found or to adjust
  if (lowerText.includes('wieczorem') && resultHour < 12) {
    resultHour += 12;
    lowerText = lowerText.replace('wieczorem', '');
  } else if (lowerText.includes('rano') && resultHour > 12) {
    // maybe they meant 8 AM but said 20? unlikely but for safety
    lowerText = lowerText.replace('rano', '');
  }

  // 3. Clean Title
  let title = lowerText
    .replace(/\s+/g, ' ')
    .replace(/^(o|na|w)\s+/i, '') // Remove starting prepositions
    .trim();

  // Capitalize first letter
  if (title) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  } else {
    title = 'Nowe przypomnienie';
  }

  return {
    title,
    date: format(resultDate, 'yyyy-MM-dd'),
    hour: resultHour % 24,
    minute: resultMinute % 60,
  };
};
