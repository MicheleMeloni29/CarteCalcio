# CarteCalcio – Serie A Exchange

CarteCalcio is a companion app for collecting, upgrading, and trading Serie A themed digital cards.
The mobile client is built with Expo/React Native and communicates with a Django REST backend that manages users, packs, quizzes, achievements, and card exchanges.

## Project Structure

- `app/` – screen components, navigation, and Expo router entry points.
- `components/` – shared UI such as the card renderer and status bar.
- `hooks/` – React context providers (authentication, credits, etc.).
- `constants/api.ts` – source of truth for the backend base URL (update after starting ngrok).
- `db_carte/` – Django project powering authentication, packs, quizzes, and collections.
- `assets/` – static images (backgrounds, cards, icons).

## Requirements

- Node.js 18+ (or the current Expo LTS), npm or Yarn.
- Expo CLI (`npm install -g expo-cli`) or use `npx`.
- Python 3.11+ with pip for the Django backend.
- ngrok (or another tunneling service) if you need to expose the backend to mobile devices.

## Backend Setup (Django)

1. Move to the backend directory:
   ```bash
   cd db_carte
   ```
2. (Optional) create and activate a virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   source .venv/bin/activate  # macOS / Linux
   ```
3. Install dependencies and apply migrations:
   ```bash
   pip install -r requirements.txt
   python manage.py migrate
   ```
4. (Optional) create an admin user or load seed data:
   ```bash
   python manage.py createsuperuser
   ```
5. Start the backend API:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

## Expose the Backend with ngrok

1. In a new terminal run:
   ```bash
   ngrok http 8000
   ```
2. Copy the generated HTTPS forwarding URL.
3. Update `constants/api.ts` so that `API_BASE_URL` matches the tunnel address, for example:
   ```ts
   export const API_BASE_URL = 'https://<your-id>.ngrok-free.app';
   ```
4. Restart the Expo dev client or reload the app to pick up the new URL.

## Frontend Setup (Expo)

1. From the repository root install JavaScript dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
2. Start the Expo development server:
   ```bash
   npx expo start
   ```
3. Choose how to launch the app:
   - press `a` for Android emulator,
   - press `i` for iOS simulator (macOS only),
   - scan the QR code with Expo Go on a physical device.

With the client connected to the backend you can log in/register, browse your collection, open packs, play quizzes to earn credits, and manage card exchanges.

## Useful Scripts

```bash
npm run start      # start Expo CLI
npm run android    # Expo + Android emulator
npm run ios        # Expo + iOS simulator
npm run web        # Expo web preview
npm test           # Jest test suite
npm run lint       # Expo/ESLint checks
```

## Troubleshooting

- **Cannot reach backend:** verify the Django server is running, the ngrok tunnel is active, and `API_BASE_URL` matches the public URL.
- **Authentication errors:** clear cached tokens by reinstalling the app or wiping Expo Go data, then log in again.
- **Broken gradients or missing images:** confirm the assets exist in `assets/images` and the backend responses reference valid image paths.

## Further Reading

- [Expo documentation](https://docs.expo.dev/)
- [React Navigation docs](https://reactnavigation.org/docs/getting-started/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [ngrok docs](https://ngrok.com/docs)
