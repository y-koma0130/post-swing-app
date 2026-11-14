// 生徒向け：スマホ前提の1カラム
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-md bg-white">{children}</div>
}
