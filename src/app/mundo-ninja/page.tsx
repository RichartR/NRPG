import { MasterServerService } from '@/services/supabase/master.server.service';
import MundoNinjaClientView from './MundoNinjaClientView';

export default async function MundoNinjaSelectionPage() {
  const [aldeas, countsMap, maxCuposRaw] = await Promise.all([
    MasterServerService.getCachedAldeasActivas(),
    MasterServerService.getCachedCharacterCountsByAldea(),
    MasterServerService.getCachedConfiguracion('cupos_maximos_aldea')
  ]);

  const maxCupos =
    maxCuposRaw != null && maxCuposRaw !== ''
      ? Number(maxCuposRaw)
      : 30;

  return (
    <MundoNinjaClientView
      aldeas={aldeas}
      countsMap={countsMap}
      maxCupos={maxCupos}
    />
  );
}
