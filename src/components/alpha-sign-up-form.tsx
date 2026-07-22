"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  countries,
  Country,
  gamingFrequencies,
  GamingFrequency,
  Genre,
  genres,
  Platform,
  platforms,
  PreferredLanguage,
  preferredLanguages,
  yearOfBirthRange,
} from "@/src/Contacts/domain/Contact";
import { Link } from "@/src/i18n/navigation";

/**
 * A yet-unanswered optional yes/no question. "" means unanswered, which stays
 * distinct from answering "no", mirroring the nullable booleans of the domain.
 */
type YesNo = "" | "yes" | "no";

const yesNoValues = ["yes", "no"] as const;

/**
 * Narrows a raw select value to one of the canonical choices without type
 * assertions: anything outside the set collapses to "" (unanswered).
 */
const parseChoice = <T extends readonly string[]>(
  values: T,
  raw: string,
): T[number] | "" => values.find((value) => value === raw) ?? "";

interface FormState {
  displayName: string;
  email: string;
  country: "" | Country;
  countryOther: string;
  preferredLanguage: "" | PreferredLanguage;
  preferredLanguageOther: string;
  yearOfBirth: string;
  gamingFrequency: "" | GamingFrequency;
  gamingSessionLengthHours: string;
  usedPlatforms: Platform[];
  usedPlatformsOther: string;
  preferredPlatform: "" | Platform;
  preferredPlatformOther: string;
  hasParticipatedInPlaytests: YesNo;
  hasGivenPlaytestFeedback: YesNo;
  preferredGenres: Genre[];
  avoidedGenres: Genre[];
  lastGamePlayed: string;
  hasWishlistedHelix: YesNo;
  wantsEmailUpdates: boolean;
  wantsEmailFeedbackRequests: boolean;
  acceptsPrivacyPolicy: boolean;
}

interface FieldErrors {
  displayName?: string;
  email?: string;
  yearOfBirth?: string;
  acceptsPrivacyPolicy?: string;
}

const initialState: FormState = {
  displayName: "",
  email: "",
  country: "",
  countryOther: "",
  preferredLanguage: "",
  preferredLanguageOther: "",
  yearOfBirth: "",
  gamingFrequency: "",
  gamingSessionLengthHours: "",
  usedPlatforms: [],
  usedPlatformsOther: "",
  preferredPlatform: "",
  preferredPlatformOther: "",
  hasParticipatedInPlaytests: "",
  hasGivenPlaytestFeedback: "",
  preferredGenres: [],
  avoidedGenres: [],
  lastGamePlayed: "",
  hasWishlistedHelix: "",
  wantsEmailUpdates: false,
  wantsEmailFeedbackRequests: false,
  acceptsPrivacyPolicy: false,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Fixed choices for the usual play session length, in hours. Offered as a
 * select to lower friction, but stored as the plain number each one maps to.
 */
const sessionLengthHours = ["0.5", "1", "2", "4", "8"] as const;

const labelClass = "mb-1 block font-semibold";
const inputClass =
  "w-full rounded-md border border-gray-600 bg-gray-900 p-2 text-white transition-colors placeholder:text-gray-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-none";
const fieldClass = "mb-5";
const checkboxClass = "size-4 shrink-0 accent-indigo-500";
const checkboxGridClass = "grid grid-cols-2 gap-2 sm:grid-cols-3";
const sectionClass =
  "mb-6 rounded-lg border border-gray-700 bg-gray-800/40 p-5 sm:p-6";
const sectionTitleClass =
  "mb-4 border-b border-indigo-400 pb-2 text-lg font-bold text-emerald-200";

/**
 * The alpha sign-up questionnaire. Runs in the browser: it validates the
 * required fields, posts the answers to the registration endpoint and swaps
 * itself for the "check your inbox" message once the registration is accepted.
 * Closed answers travel as canonical tokens; only the labels are localized.
 */
const AlphaSignUpForm: React.FC = () => {
  const t = useTranslations("AlphaSignUpPage");
  const locale = useLocale();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleInList = <
    K extends "usedPlatforms" | "preferredGenres" | "avoidedGenres",
  >(
    key: K,
    value: FormState[K][number],
  ) => {
    setForm((current) => {
      const list: FormState[K][number][] = current[key];
      const next = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];

      return { ...current, [key]: next };
    });
  };

  const fieldError = (field: keyof FieldErrors): string | undefined => {
    switch (field) {
      case "displayName":
        return form.displayName.trim()
          ? undefined
          : t("error_display_name_required");
      case "email": {
        const email = form.email.trim();

        if (!email) {
          return t("error_email_required");
        }

        return EMAIL_PATTERN.test(email) ? undefined : t("error_email_invalid");
      }
      case "yearOfBirth": {
        if (!form.yearOfBirth.trim()) {
          return undefined;
        }

        const year = Number(form.yearOfBirth);

        return Number.isInteger(year) &&
          year >= yearOfBirthRange.min &&
          year <= yearOfBirthRange.max
          ? undefined
          : t("error_year_of_birth_invalid");
      }
      case "acceptsPrivacyPolicy":
        return form.acceptsPrivacyPolicy
          ? undefined
          : t("error_privacy_policy_required");
    }
  };

  const validatedFields: (keyof FieldErrors)[] = [
    "displayName",
    "email",
    "yearOfBirth",
    "acceptsPrivacyPolicy",
  ];

  const validate = (): FieldErrors => {
    const found: FieldErrors = {};

    for (const field of validatedFields) {
      const error = fieldError(field);

      if (error) {
        found[field] = error;
      }
    }

    setErrors(found);

    return found;
  };

  const handleBlur = (field: keyof FieldErrors) => {
    setErrors((current) => {
      const next = { ...current };
      const error = fieldError(field);

      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }

      return next;
    });
  };

  /**
   * Brings the first invalid field into view and focuses it, so on a long form
   * (especially on mobile) the person lands right where the problem is.
   */
  const focusFirstInvalidField = (found: FieldErrors) => {
    const fieldIds: (keyof FieldErrors)[] = [
      "displayName",
      "email",
      "yearOfBirth",
      "acceptsPrivacyPolicy",
    ];
    const firstInvalid = fieldIds.find((id) => found[id]);

    if (!firstInvalid) {
      return;
    }

    const element = document.getElementById(firstInvalid);

    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus({ preventScroll: true });
  };

  const toPayload = () => {
    const text = (value: string) => value.trim() || undefined;
    const number = (value: string) =>
      value.trim() ? Number(value) : undefined;
    const yesNo = (value: YesNo) =>
      value === "" ? undefined : value === "yes";
    const list = (values: string[]) => (values.length > 0 ? values : undefined);
    const otherText = (selected: boolean, value: string) =>
      selected ? text(value) : undefined;

    return {
      displayName: form.displayName.trim(),
      email: form.email.trim(),
      country: text(form.country),
      countryOther: otherText(form.country === "other", form.countryOther),
      preferredLanguage: text(form.preferredLanguage),
      preferredLanguageOther: otherText(
        form.preferredLanguage === "other",
        form.preferredLanguageOther,
      ),
      yearOfBirth: number(form.yearOfBirth),
      gamingFrequency: text(form.gamingFrequency),
      gamingSessionLengthHours: number(form.gamingSessionLengthHours),
      usedPlatforms: list(form.usedPlatforms),
      usedPlatformsOther: otherText(
        form.usedPlatforms.includes("other"),
        form.usedPlatformsOther,
      ),
      preferredPlatform: text(form.preferredPlatform),
      preferredPlatformOther: otherText(
        form.preferredPlatform === "other",
        form.preferredPlatformOther,
      ),
      hasParticipatedInPlaytests: yesNo(form.hasParticipatedInPlaytests),
      hasGivenPlaytestFeedback: yesNo(form.hasGivenPlaytestFeedback),
      preferredGenres: list(form.preferredGenres),
      avoidedGenres: list(form.avoidedGenres),
      lastGamePlayed: text(form.lastGamePlayed),
      hasWishlistedHelix: yesNo(form.hasWishlistedHelix),
      wantsEmailUpdates: form.wantsEmailUpdates,
      wantsEmailFeedbackRequests: form.wantsEmailFeedbackRequests,
      acceptsPrivacyPolicy: form.acceptsPrivacyPolicy,
      locale,
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validate();

    if (Object.keys(found).length > 0) {
      focusFirstInvalidField(found);

      return;
    }

    setSubmitting(true);
    setSubmitError(false);

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload()),
      });

      if (!response.ok) {
        throw new Error(`Registration failed with status ${response.status}`);
      }

      setSubmitted(true);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        role="status"
        className="container mx-auto mb-4 rounded-md bg-gray-800 break-words drop-shadow-xl"
      >
        <div className="px-3 py-8 text-center sm:px-6 md:px-8">
          <h2 className="mb-4 text-2xl font-bold text-emerald-200 md:text-3xl lg:text-4xl">
            {t("success_title")}
          </h2>
          <p className="mb-8 text-slate-300">{t("success_message")}</p>
          <Link
            href="/games"
            className="inline-block rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            {t("back_to_games")}
          </Link>
        </div>
      </div>
    );
  }

  const yesNoSelect = (
    key:
      | "hasParticipatedInPlaytests"
      | "hasGivenPlaytestFeedback"
      | "hasWishlistedHelix",
    label: React.ReactNode,
  ) => (
    <div className={fieldClass}>
      <label className={labelClass} htmlFor={key}>
        {label}
      </label>
      <select
        id={key}
        className={inputClass}
        value={form[key]}
        onChange={(event) =>
          set(key, parseChoice(yesNoValues, event.target.value))
        }
      >
        <option value="">{t("option_not_answered")}</option>
        <option value="yes">{t("option_yes")}</option>
        <option value="no">{t("option_no")}</option>
      </select>
    </div>
  );

  const genreChecklist = (
    key: "preferredGenres" | "avoidedGenres",
    label: string,
  ) => (
    <fieldset className={fieldClass}>
      <legend className={labelClass}>{label}</legend>
      <div className={checkboxGridClass}>
        {genres.map((genre) => (
          <label key={genre} className="flex items-center gap-2">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={form[key].includes(genre)}
              onChange={() => toggleInList(key, genre)}
            />
            {t(`option_genre_${genre}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <form
      className="mx-auto max-w-xl"
      onSubmit={handleSubmit}
      noValidate
      aria-busy={submitting}
    >
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t("section_about_you")}</h2>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="displayName">
            {t("label_display_name")} *
          </label>
          <input
            id="displayName"
            className={inputClass}
            type="text"
            required
            value={form.displayName}
            onChange={(event) => set("displayName", event.target.value)}
            onBlur={() => handleBlur("displayName")}
          />
          {errors.displayName && (
            <p className="mt-1 text-sm text-red-400">{errors.displayName}</p>
          )}
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="email">
            {t("label_email")} *
          </label>
          <input
            id="email"
            className={inputClass}
            type="email"
            required
            value={form.email}
            onChange={(event) => set("email", event.target.value)}
            onBlur={() => handleBlur("email")}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-400">{errors.email}</p>
          )}
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="country">
            {t("label_country")}
          </label>
          <select
            id="country"
            className={inputClass}
            value={form.country}
            onChange={(event) =>
              set("country", parseChoice(countries, event.target.value))
            }
          >
            <option value="">{t("option_not_answered")}</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {t(`option_country_${country}`)}
              </option>
            ))}
          </select>
          {form.country === "other" && (
            <input
              className={`${inputClass} mt-2`}
              type="text"
              placeholder={t("label_other_country")}
              aria-label={t("label_other_country")}
              value={form.countryOther}
              onChange={(event) => set("countryOther", event.target.value)}
            />
          )}
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="preferredLanguage">
            {t("label_preferred_language")}
          </label>
          <select
            id="preferredLanguage"
            className={inputClass}
            value={form.preferredLanguage}
            onChange={(event) =>
              set(
                "preferredLanguage",
                parseChoice(preferredLanguages, event.target.value),
              )
            }
          >
            <option value="">{t("option_not_answered")}</option>
            {preferredLanguages.map((language) => (
              <option key={language} value={language}>
                {t(`option_language_${language}`)}
              </option>
            ))}
          </select>
          {form.preferredLanguage === "other" && (
            <input
              className={`${inputClass} mt-2`}
              type="text"
              placeholder={t("label_other_language")}
              aria-label={t("label_other_language")}
              value={form.preferredLanguageOther}
              onChange={(event) =>
                set("preferredLanguageOther", event.target.value)
              }
            />
          )}
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="yearOfBirth">
            {t("label_year_of_birth")}
          </label>
          <input
            id="yearOfBirth"
            className={inputClass}
            type="number"
            min={yearOfBirthRange.min}
            max={yearOfBirthRange.max}
            value={form.yearOfBirth}
            onChange={(event) => set("yearOfBirth", event.target.value)}
            onBlur={() => handleBlur("yearOfBirth")}
          />
          {errors.yearOfBirth && (
            <p className="mt-1 text-sm text-red-400">{errors.yearOfBirth}</p>
          )}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t("section_how_you_play")}</h2>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="gamingFrequency">
            {t("label_gaming_frequency")}
          </label>
          <select
            id="gamingFrequency"
            className={inputClass}
            value={form.gamingFrequency}
            onChange={(event) =>
              set(
                "gamingFrequency",
                parseChoice(gamingFrequencies, event.target.value),
              )
            }
          >
            <option value="">{t("option_not_answered")}</option>
            {gamingFrequencies.map((frequency) => (
              <option key={frequency} value={frequency}>
                {t(`option_frequency_${frequency}`)}
              </option>
            ))}
          </select>
        </div>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="gamingSessionLengthHours">
            {t("label_gaming_session_length_hours")}
          </label>
          <select
            id="gamingSessionLengthHours"
            className={inputClass}
            value={form.gamingSessionLengthHours}
            onChange={(event) =>
              set("gamingSessionLengthHours", event.target.value)
            }
          >
            <option value="">{t("option_not_answered")}</option>
            {sessionLengthHours.map((hours) => (
              <option key={hours} value={hours}>
                {t(`option_session_length_${hours.replace(".", "_")}`)}
              </option>
            ))}
          </select>
        </div>

        <fieldset className={fieldClass}>
          <legend className={labelClass}>{t("label_used_platforms")}</legend>
          <div className={checkboxGridClass}>
            {platforms.map((platform) => (
              <label key={platform} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={form.usedPlatforms.includes(platform)}
                  onChange={() => toggleInList("usedPlatforms", platform)}
                />
                {t(`option_platform_${platform}`)}
              </label>
            ))}
          </div>
          {form.usedPlatforms.includes("other") && (
            <input
              className={`${inputClass} mt-2`}
              type="text"
              placeholder={t("label_other_platforms")}
              aria-label={t("label_other_platforms")}
              value={form.usedPlatformsOther}
              onChange={(event) =>
                set("usedPlatformsOther", event.target.value)
              }
            />
          )}
        </fieldset>

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="preferredPlatform">
            {t("label_preferred_platform")}
          </label>
          <select
            id="preferredPlatform"
            className={inputClass}
            value={form.preferredPlatform}
            onChange={(event) =>
              set(
                "preferredPlatform",
                parseChoice(platforms, event.target.value),
              )
            }
          >
            <option value="">{t("option_not_answered")}</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {t(`option_platform_${platform}`)}
              </option>
            ))}
          </select>
          {form.preferredPlatform === "other" && (
            <input
              className={`${inputClass} mt-2`}
              type="text"
              placeholder={t("label_other_platform")}
              aria-label={t("label_other_platform")}
              value={form.preferredPlatformOther}
              onChange={(event) =>
                set("preferredPlatformOther", event.target.value)
              }
            />
          )}
        </div>

        {yesNoSelect(
          "hasParticipatedInPlaytests",
          t("label_has_participated_in_playtests"),
        )}
        {yesNoSelect(
          "hasGivenPlaytestFeedback",
          t("label_has_given_playtest_feedback"),
        )}

        {genreChecklist("preferredGenres", t("label_preferred_genres"))}
        {genreChecklist("avoidedGenres", t("label_avoided_genres"))}

        <div className={fieldClass}>
          <label className={labelClass} htmlFor="lastGamePlayed">
            {t("label_last_game_played")}
          </label>
          <input
            id="lastGamePlayed"
            className={inputClass}
            type="text"
            value={form.lastGamePlayed}
            onChange={(event) => set("lastGamePlayed", event.target.value)}
          />
        </div>

        {yesNoSelect(
          "hasWishlistedHelix",
          t.rich("label_has_wishlisted", {
            link: (chunks) => (
              <a
                href="https://store.steampowered.com/app/2673830/Blood__Bytes_Kagura/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-500 hover:text-emerald-200 hover:underline"
              >
                {chunks}
              </a>
            ),
          }),
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t("section_email_preferences")}</h2>

        <div className={fieldClass}>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className={`${checkboxClass} mt-0.5`}
              checked={form.wantsEmailUpdates}
              onChange={(event) =>
                set("wantsEmailUpdates", event.target.checked)
              }
            />
            {t("label_wants_email_updates")}
          </label>
        </div>

        <div className={fieldClass}>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className={`${checkboxClass} mt-0.5`}
              checked={form.wantsEmailFeedbackRequests}
              onChange={(event) =>
                set("wantsEmailFeedbackRequests", event.target.checked)
              }
            />
            {t("label_wants_email_feedback_requests")}
          </label>
        </div>
      </section>

      <div className={fieldClass}>
        <label className="flex items-start gap-2">
          <input
            id="acceptsPrivacyPolicy"
            type="checkbox"
            className={`${checkboxClass} mt-0.5`}
            checked={form.acceptsPrivacyPolicy}
            onChange={(event) => {
              set("acceptsPrivacyPolicy", event.target.checked);

              if (event.target.checked) {
                setErrors((current) => {
                  const next = { ...current };

                  delete next.acceptsPrivacyPolicy;

                  return next;
                });
              }
            }}
          />
          <span>
            {t.rich("label_accepts_privacy_policy", {
              link: (chunks) => (
                <a
                  href={`/${locale}/games/blood-and-bytes-kagura/privacy-policy`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-500 hover:text-emerald-200 hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}{" "}
            *
          </span>
        </label>
        {errors.acceptsPrivacyPolicy && (
          <p className="mt-1 text-sm text-red-400">
            {errors.acceptsPrivacyPolicy}
          </p>
        )}
      </div>

      {Object.keys(errors).length > 0 && (
        <p className="mb-4 text-red-400" role="alert">
          {t("error_review_fields")}
        </p>
      )}

      {submitError && (
        <p className="mb-4 text-red-400" role="alert">
          {t("error_submit")}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {submitting ? t("submitting") : t("submit")}
      </button>
    </form>
  );
};

export default AlphaSignUpForm;
