/**
 * Mobile Access Block Component
 * Shows paywall message for mobile users without subscription
 * Renders in normal document flow (not as overlay) to allow page scrolling
 */

import { Button } from "@/components/ui/button";

export function MobileAccessBlock() {
  // Simple fake data for background blur effect
  const fakeData = [
    { symbol: "ABC", hasEvent: true },
    { symbol: "XYZ", hasEvent: false },
    { symbol: "QWE", hasEvent: true },
    { symbol: "RTY", hasEvent: false },
  ];

  return (
    <div className="relative flex min-h-[600px] flex-col px-4 py-8">
      {/* Blurred background grid */}
      <div className="absolute inset-0 pointer-events-none select-none blur-[3px] opacity-70" aria-hidden="true">
        <div className="overflow-hidden rounded-lg border">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Symbol</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">2026-01-20</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">2026-01-21</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">2026-01-22</th>
              </tr>
            </thead>
            <tbody>
              {fakeData.map((item) => (
                <tr key={item.symbol}>
                  <td className="bg-white px-3 py-2 text-xs font-medium text-gray-900">{item.symbol}</td>
                  <td className="p-1">
                    <div className={`h-8 rounded ${item.hasEvent ? "bg-green-100" : "bg-gray-50"}`}></div>
                  </td>
                  <td className="p-1">
                    <div className="h-8 rounded bg-gray-50"></div>
                  </td>
                  <td className="p-1">
                    <div className={`h-8 rounded ${item.hasEvent ? "bg-red-100" : "bg-gray-50"}`}></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="text-center">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-blue-100 p-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>

            {/* Heading */}
            <h3 className="mb-3 text-2xl font-bold text-gray-900">Odblokuj pełny dostęp</h3>

            {/* Description */}
            <p className="mb-6 text-gray-600">
              Zobacz rzeczywiste dane Black Swan events i uzyskaj dostęp do szczegółowych analiz AI.
            </p>

            {/* Features box */}
            <div className="mb-6 rounded-lg bg-blue-50 p-4 text-left">
              <p className="mb-2 text-sm font-semibold text-gray-900">Co zyskujesz:</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">✓</span>
                  <span>Pełny dostęp do historycznych danych</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">✓</span>
                  <span>AI analizy wszystkich zdarzeń</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">✓</span>
                  <span>Zaawansowane filtry i sortowanie</span>
                </li>
              </ul>
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              className="w-full text-base font-semibold shadow-sm"
              onClick={() => (window.location.href = "/checkout")}
            >
              Kup plan
            </Button>

            {/* Footer note */}
            <p className="mt-4 text-xs text-gray-500">7 dni za darmo • Anuluj w każdej chwili</p>
          </div>
        </div>
      </div>
    </div>
  );
}
