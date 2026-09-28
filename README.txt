LikeHome interaction polish pass

Replace these files in your project:
- app/search/components/SearchForm.tsx
- app/search/components/PopularDestinations.tsx
- app/search/components/DestinationCard.tsx

Included changes:
- Popular destinations keeps the smooth 3-card horizontal slide carousel fix.
- Destination autocomplete: Tab fills the first visible suggestion and then moves on.
- Enter searches exactly what is currently typed in the destination field.
- Suggestion buttons are removed from the Tab order so Tab moves naturally to Dates.
- Escape closes the suggestion dropdown.
