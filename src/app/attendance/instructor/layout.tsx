import VerifiedAccess from '@/components/attendance/VerifiedAccess'
export default function Layout({children}:{children:React.ReactNode}){return <VerifiedAccess instructor returnTo="/attendance/instructor">{children}</VerifiedAccess>}
