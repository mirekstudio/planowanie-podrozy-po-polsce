import { test } from "node:test";
import assert from "node:assert/strict";
import { describeWeatherCode, classifyWeatherMood, type CurrentWeather } from "./weather";

function weather(overrides: Partial<CurrentWeather>): CurrentWeather {
  return { temperatureC: 15, precipitationMm: 0, weatherCode: 0, ...overrides };
}

test("describeWeatherCode: rozpoznaje realny kod WMO (63 = deszcz)", () => {
  const { label } = describeWeatherCode(63);
  assert.equal(label, "Deszcz");
});

test("describeWeatherCode: nieznany/nieudokumentowany kod spada na neutralny placeholder, nie rzuca wyjątku", () => {
  const { emoji, label } = describeWeatherCode(9999);
  assert.equal(emoji, "🌡️");
  assert.equal(label, "Pogoda");
});

test("classifyWeatherMood: kod deszczu (63) daje 'rain'", () => {
  assert.equal(classifyWeatherMood(weather({ weatherCode: 63 })), "rain");
});

test("classifyWeatherMood: kod śniegu/burzy też liczy się jako 'rain' (opady zniechęcające do plenera)", () => {
  assert.equal(classifyWeatherMood(weather({ weatherCode: 73 })), "rain");
  assert.equal(classifyWeatherMood(weather({ weatherCode: 95 })), "rain");
});

test("classifyWeatherMood: realny opad (precipitationMm > 0) daje 'rain' NIEZALEŻNIE od kodu (druga linia obrony)", () => {
  assert.equal(classifyWeatherMood(weather({ weatherCode: 0, precipitationMm: 1.2 })), "rain");
});

test("classifyWeatherMood: bezchmurnie/częściowe zachmurzenie bez opadu daje 'nice'", () => {
  assert.equal(classifyWeatherMood(weather({ weatherCode: 0 })), "nice");
  assert.equal(classifyWeatherMood(weather({ weatherCode: 2 })), "nice");
});

test("classifyWeatherMood: duże zachmurzenie/mgła bez opadu to 'neutral', nie 'nice' ani 'rain'", () => {
  assert.equal(classifyWeatherMood(weather({ weatherCode: 3 })), "neutral");
  assert.equal(classifyWeatherMood(weather({ weatherCode: 45 })), "neutral");
});
