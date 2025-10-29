import Link from "next/link"
import Image from "next/image"

const Header = () => {
  return (
    <header className="bg-background border-b z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Image src="/logo.png" alt="Catch My Event Logo" width={32} height={32} />
          <div className="flex flex-col">
            <span className="font-bold text-lg">Catch My Event</span>
            <span className="text-xs text-muted-foreground">Catch all events near you</span>
          </div>
        </Link>
      </div>
    </header>
  )
}

export default Header
