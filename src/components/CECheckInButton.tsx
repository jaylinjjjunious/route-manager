import { useCECheckIn } from "../hooks/useExternalBrowser";

export function CECheckInButton() {
  const { openCheckIn, openCheckInPath } = useCECheckIn();

  return (
    <div className="flex gap-2">
      <button
        onClick={openCheckIn}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Open CE Check-In
      </button>
      <button
        onClick={() => openCheckInPath("/dashboard")}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
      >
        Open Dashboard
      </button>
    </div>
  );
}