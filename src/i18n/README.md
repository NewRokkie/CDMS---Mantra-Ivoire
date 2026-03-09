# i18n Configuration

This directory contains the internationalization (i18n) configuration for the CDMS application using react-i18next.

## Structure

```
i18n/
├── config.ts           # Main i18n configuration
└── locales/
    ├── en.json        # English translations
    └── fr.json        # French translations
```

## Configuration

The `config.ts` file initializes i18next with:
- Supported languages: English (en), French (fr)
- Default language: English (en)
- Fallback language: English (en)
- Storage: localStorage (automatic persistence)
- React integration: react-i18next

## Usage

### In Components

```typescript
import { useTranslation } from 'react-i18next';

export const MyComponent = () => {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button onClick={() => i18n.changeLanguage('fr')}>
        Français
      </button>
    </div>
  );
};
```

### Backward Compatibility

For existing code using the old `useLanguage` hook:

```typescript
import { useLanguage } from '../hooks/useLanguage';

export const MyComponent = () => {
  const { t, language, setLanguage } = useLanguage();
  
  return (
    <div>
      <p>{t('common.welcome')}</p>
      <button onClick={() => setLanguage('fr')}>FR</button>
    </div>
  );
};
```

## Translation Keys

Translation keys follow a hierarchical structure:

```
namespace.section.key
```

Examples:
- `nav.dashboard` - Navigation dashboard label
- `containers.title` - Containers page title
- `common.save` - Common save button
- `gate.in.title` - Gate In page title

## Adding New Translations

1. Add the key to both `en.json` and `fr.json`
2. Follow the existing hierarchy structure
3. Use descriptive key names
4. Keep translations consistent across files

Example:
```json
{
  "myFeature": {
    "title": "My Feature Title",
    "description": "My Feature Description"
  }
}
```

## Language Persistence

Languages are automatically persisted to localStorage with the key `i18nextLng`. This means:
- User's language choice is remembered across sessions
- No additional code needed for persistence
- Automatic fallback to browser language on first visit

## Supported Languages

- **en** - English
- **fr** - Français

To add a new language:
1. Create a new JSON file in `locales/` (e.g., `es.json`)
2. Add the language code to `config.ts` resources
3. Add the language to the supported languages list

## Best Practices

1. **Consistency**: Use the same key for the same concept across the app
2. **Hierarchy**: Organize keys logically by feature/section
3. **Completeness**: Always provide translations in all supported languages
4. **Clarity**: Use clear, descriptive key names
5. **Formatting**: Keep JSON properly formatted and indented

## Troubleshooting

### Missing Translations
If a translation key is not found:
- Check the key spelling
- Verify the key exists in both language files
- Check the JSON syntax for errors
- Use the browser console to see i18n warnings

### Language Not Changing
- Clear browser localStorage
- Check that `i18n.changeLanguage()` is called correctly
- Verify the language code is correct (en, fr)

### Performance Issues
- Translations are loaded synchronously (consider lazy loading for large apps)
- JSON files are bundled with the application
- No runtime translation fetching

## Integration with Components

The Header component includes a language switcher that uses i18n:

```typescript
const { language, setLanguage, t } = useLanguage();

<select value={language} onChange={(e) => setLanguage(e.target.value)}>
  <option value="en">English</option>
  <option value="fr">Français</option>
</select>
```

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [JSON Translation Format](https://www.i18next.com/misc/json-format)
