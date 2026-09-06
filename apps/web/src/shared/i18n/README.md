# Adding a language

SkillsLink keeps translations in source-controlled JSON so every locale is statically rendered and reviewed with the code that uses it.

1. Copy one file in `langs/` and translate every value without changing keys.
2. Add the language code to `LanguageCode` and `LANGUAGE_CODES`.
3. Import the JSON file and add it to `LocaleLang`.
4. Add the translated language name to every dictionary's `menu` object.
5. Run `npm run check` and inspect the generated locale routes.

`LocaleDictionary` is the shared contract. TypeScript rejects a dictionary with missing or incompatible fields.
