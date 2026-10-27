// Local ESM port of the `gematry` package (MIT, github.com/doradsoft/gematry).
// The published dist is a webpack dev bundle that eval()s its own module code,
// which crashes in the strict-mode ESM output of the production vite build.

interface ToNumberOptions {
	treatManzpachDifferently: boolean;
	throwIfNotLetter: boolean;
}

interface ToLettersOptions {
	maskHashem: boolean;
	thousands: boolean;
	thousandsSeparator: string;
	addQuotes: boolean;
}

const lettersValues: Record<string, number> = {
	א: 1,
	ב: 2,
	ג: 3,
	ד: 4,
	ה: 5,
	ו: 6,
	ז: 7,
	ח: 8,
	ט: 9,
	י: 10,
	כ: 20,
	ל: 30,
	מ: 40,
	נ: 50,
	ס: 60,
	ע: 70,
	פ: 80,
	צ: 90,
	ק: 100,
	ר: 200,
	ש: 300,
	ת: 400,
	ך: 20,
	ם: 40,
	ן: 50,
	ף: 80,
	ץ: 90,
	"": 0,
};

const lettersValuesWithMantzpach: Record<string, number> = {
	...lettersValues,
	ך: 500,
	ם: 600,
	ן: 700,
	ף: 800,
	ץ: 900,
};

const DEFAULT_TO_NUMBER_OPTIONS: ToNumberOptions = {
	treatManzpachDifferently: false,
	throwIfNotLetter: false,
};

const DEFAULT_TO_LETTERS_OPTIONS: ToLettersOptions = {
	maskHashem: true,
	thousands: false,
	thousandsSeparator: "",
	addQuotes: false,
};

export function toNumber(phrase: string, options?: Partial<ToNumberOptions>): number {
	const resolved = { ...DEFAULT_TO_NUMBER_OPTIONS, ...options };
	const dict = resolved.treatManzpachDifferently ? lettersValuesWithMantzpach : lettersValues;
	let sum = 0;
	let i = phrase.length;
	while (i--) {
		if (phrase[i] >= "א" && phrase[i] <= "ת") {
			sum += dict[phrase[i]];
		} else if (resolved.throwIfNotLetter) {
			throw new Error(`Character ${phrase[i]} is not a letter`);
		}
	}
	return sum;
}

export function toLetters(number: number, options?: Partial<ToLettersOptions>): string {
	const resolved = { ...DEFAULT_TO_LETTERS_OPTIONS, ...options };
	let result = "";
	let thousandsPart = 0;
	if (resolved.thousands) {
		while (number > 1000) {
			const numberOfThousands = Math.floor(number / 1000);
			thousandsPart = numberOfThousands * 1000;
			result += toLetters(numberOfThousands);
			if (resolved.thousandsSeparator !== "" && thousandsPart !== number) {
				result += resolved.thousandsSeparator;
			}
			number -= thousandsPart;
		}
	}
	const unitsPart = number % 10;
	const tensPart = (Math.floor(number / 10) % 10) * 10;
	let rest = number - tensPart - unitsPart;
	while (rest >= 400) {
		result += "ת";
		rest -= 400;
	}
	const hundredsPart = rest;
	if (hundredsPart > 0) {
		result += keyByValue(hundredsPart);
	}
	if (resolved.maskHashem && tensPart + unitsPart === 15) {
		result += "טו";
	} else if (resolved.maskHashem && tensPart + unitsPart === 16) {
		result += "טז";
	} else {
		result += keyByValue(tensPart);
		result += keyByValue(unitsPart);
	}
	if (
		resolved.addQuotes &&
		((thousandsPart === 0 && result.length >= 2) || (thousandsPart > 0 && result.length >= 3))
	) {
		result = `${result.slice(0, -1)}"${result.slice(-1)}`;
	}
	return result;
}

function keyByValue(value: number, dict = lettersValues): string {
	let result = "";
	for (const [key, val] of Object.entries(dict)) {
		if (val === value) {
			result = key;
			break;
		}
	}
	return result;
}
