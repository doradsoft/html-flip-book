/** Scale fixture (500 keys × 5 locales): baseline impl, 10 keys used. */
import { t } from "../scale/baseline/index";

const keys = [
	"key.group0.item0",
	"key.group1.item11",
	"key.group2.item22",
	"key.group3.item33",
	"key.group4.item44",
	"key.group5.item55",
	"key.group6.item66",
	"key.group7.item77",
	"key.group8.item88",
	"key.group9.item99",
];

export const labels = keys.map((k) => t(k, "he-IL"));
