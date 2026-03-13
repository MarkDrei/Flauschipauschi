export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Background fullscreen */}
      <img
        src="/background.svg"
        alt="background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Unicorn2 centered on top of background */}
      <img
        src="/unicorn2.svg"
        alt="unicorn"
        className="absolute inset-0 m-auto w-64 h-64"
      />
    </main>
  );
}
