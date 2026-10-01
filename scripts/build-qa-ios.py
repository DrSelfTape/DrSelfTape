"""Build a separate offline QA bundle; never overwrite production native assets."""
from pathlib import Path
import json
import os
import plistlib
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
stage = Path('/private/tmp/dst-qa-native')
subprocess.run(['node', 'scripts/build-qa-harness.mjs'], cwd=root, check=True)
target = stage / 'ios/App'
target.mkdir(parents=True, exist_ok=True)
for config_file in (root / 'ios').glob('*.xcconfig'):
    shutil.copy2(config_file, stage / 'ios' / config_file.name)
for name in ['App', 'App.xcodeproj', 'CapApp-SPM']:
    shutil.copytree(root / 'ios/App' / name, target / name, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('public', 'xcuserdata'))
modules = stage / 'node_modules'
if not modules.exists(): modules.symlink_to(root / 'node_modules', target_is_directory=True)
public = target / 'App/public'
shutil.copytree(root / 'output/qa/harness', public, dirs_exist_ok=True)
project = target / 'App.xcodeproj/project.pbxproj'
project.write_text(project.read_text().replace('PRODUCT_BUNDLE_IDENTIFIER = com.drselftape.app;',
                                              'PRODUCT_BUNDLE_IDENTIFIER = com.drselftape.qa;'))
info = target / 'App/Info.plist'
data = plistlib.loads(info.read_bytes()); data['CFBundleDisplayName'] = 'DST QA'
info.write_bytes(plistlib.dumps(data))
config = target / 'App/capacitor.config.json'
data = json.loads(config.read_text()); data.update(appId='com.drselftape.qa', appName='DST QA')
data.pop('server', None)
config.write_text(json.dumps(data, indent=2))
env = {**os.environ, 'DEVELOPER_DIR': '/Applications/Xcode.app/Contents/Developer'}
subprocess.run(['xcodebuild', '-project', str(target / 'App.xcodeproj'), '-scheme', 'App',
                '-configuration', 'Debug', '-sdk', 'iphonesimulator',
                '-destination', 'generic/platform=iOS Simulator',
                '-derivedDataPath', str(stage / 'DerivedData'), 'CODE_SIGNING_ALLOWED=NO', 'build'],
               env=env, check=True)
print('QA_APP=' + str(stage / 'DerivedData/Build/Products/Debug-iphonesimulator/App.app'))
