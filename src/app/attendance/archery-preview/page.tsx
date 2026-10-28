import {readFile} from 'node:fs/promises'
import path from 'node:path'
import ArcheryPreview from '@/components/archery/ArcheryPreview'
export const metadata={title:'Archery phone preview | Dance With Ceech',robots:{index:false,follow:false}}
export default async function Page(){
 const files=['src/lib/archery/demo-schema.sql',
  'supabase/migrations/20261018225039_archery_rounds_and_competitions.sql',
  'supabase/migrations/20261019010834_archery_calendar_registration.sql',
  'supabase/migrations/20261019013958_archery_score_wheel.sql',
  'supabase/migrations/20261027153351_archery_instructor_practice.sql',
  'supabase/migrations/20261027164537_archery_tournament_formats.sql',
  'supabase/migrations/20261027224308_archery_result_disputes.sql',
  'supabase/migrations/20261028002402_archery_history_visibility.sql']
 const [schema,rules,upgrade,scoreRules,instructorRules,tournamentRules,disputeRules,historyRules]=await Promise.all(files.map(file=>readFile(path.join(process.cwd(),file),'utf8')))
 return <ArcheryPreview schema={schema} rules={rules} upgrade={upgrade} scoreRules={scoreRules} instructorRules={instructorRules} tournamentRules={tournamentRules} disputeRules={disputeRules} historyRules={historyRules}/>
}
