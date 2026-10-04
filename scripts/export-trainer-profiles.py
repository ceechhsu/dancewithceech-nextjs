"""Read-only profile export. Rewards, challenges, recordings and credentials are never exported."""
import argparse, base64, hashlib, json, os, sqlite3
from pathlib import Path

def export_profiles(source, destination):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(destination, 0o700)
    with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute('SELECT account,first_name,last_name,display_name,photo_mode,photo,updated FROM learner_profiles ORDER BY account').fetchall()
    profiles = []
    for row in rows:
        item = dict(row)
        if not item['account'].startswith('google:'): raise ValueError('Non-Google profile requires manual review')
        item['photo'] = base64.b64encode(item['photo']).decode() if item['photo'] else None
        profiles.append(item)
    body = json.dumps({'schema': 1, 'policy': 'profiles-only-fresh-challenges', 'profiles': profiles}, ensure_ascii=False).encode()
    output = destination / 'profiles.json'
    with open(output, 'xb') as file:
        os.chmod(output, 0o600)
        file.write(body)
    return {'profiles': len(profiles), 'sha256': hashlib.sha256(body).hexdigest(), 'challenge_records_exported': 0}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('database'); parser.add_argument('private_output_directory')
    args = parser.parse_args()
    print(json.dumps(export_profiles(args.database, args.private_output_directory)))
