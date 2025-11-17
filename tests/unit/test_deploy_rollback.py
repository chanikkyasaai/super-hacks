import os
import types
import pytest

from datetime import datetime

import sys
import types as _types

# Provide a lightweight fake boto3 module so importing tools (which imports boto3)
# doesn't fail during unit tests that monkeypatch get_table.
if 'boto3' not in sys.modules:
    sys.modules['boto3'] = _types.SimpleNamespace(
        resource=lambda *a, **k: None, client=lambda *a, **k: None)

import super_hacks.tools as tools


class FakeTable:
    def __init__(self, items=None):
        # items: dict mapping key value to item dict
        self.items = items or {}
        self.put_items = []
        self.updates = []

    def get_item(self, Key):
        key = Key.get('patchId')
        item = self.items.get(key)
        if item is None:
            return {}
        return {'Item': dict(item)}

    def update_item(self, Key=None, UpdateExpression=None, ExpressionAttributeNames=None, ExpressionAttributeValues=None):
        key = Key.get('patchId')
        if key not in self.items:
            raise Exception('Item not found')
        # Simplified: apply provided ExpressionAttributeValues
        vals = ExpressionAttributeValues or {}
        if ':st' in vals:
            self.items[key]['status'] = vals[':st']
        if ':d' in vals:
            self.items[key]['deployedAt'] = vals[':d']
        if ':r' in vals:
            self.items[key]['rolledBackAt'] = vals[':r']
        if ':zero' in vals and 'impactScore' not in self.items[key]:
            self.items[key]['impactScore'] = vals[':zero']
        self.updates.append(
            {'Key': Key, 'Values': vals, 'Expr': UpdateExpression})
        return {'Attributes': self.items[key]}

    def put_item(self, Item):
        # used by events table
        self.put_items.append(Item)
        return {'ResponseMetadata': {'HTTPStatusCode': 200}}


def fake_get_table_factory(patches=None):
    patches_table = FakeTable(items=patches or {})
    events_table = FakeTable()

    def _get_table(name):
        # Accept both env var keys and literal names
        if name == 'PATCHES_TABLE_NAME' or name == 'IPO-Patches' or (isinstance(name, str) and name == os.getenv('PATCHES_TABLE_NAME')):
            return patches_table
        if name == 'EVENTS_TABLE_NAME' or name == 'IPO-Events' or (isinstance(name, str) and name == os.getenv('EVENTS_TABLE_NAME')):
            return events_table
        return None

    return _get_table, patches_table, events_table


def test_deploy_success(monkeypatch):
    patches = {'PATCH-1': {'patchId': 'PATCH-1', 'status': 'SANDBOX_PASSED'}}
    getter, patches_table, events_table = fake_get_table_factory(patches)
    monkeypatch.setattr(tools, 'get_table', getter)

    res = tools.deploy_patch('PATCH-1')
    assert res.get('status') == 'ok'
    assert 'deployedAt' in res
    # Verify table status updated
    assert patches['PATCH-1']['status'] == 'DEPLOYED'
    # An event should be recorded
    assert len(events_table.put_items) >= 1
    evt = events_table.put_items[-1]
    assert evt['type'] in ('deploy', 'deployment') or evt['type'] == 'deploy'
    assert evt['patchId'] == 'PATCH-1'


def test_deploy_wrong_status(monkeypatch):
    patches = {'PATCH-2': {'patchId': 'PATCH-2', 'status': 'SANDBOX_FAILED'}}
    getter, patches_table, events_table = fake_get_table_factory(patches)
    monkeypatch.setattr(tools, 'get_table', getter)

    res = tools.deploy_patch('PATCH-2')
    assert res.get('status') == 'error'
    assert 'not eligible' in res.get('message')
    # Ensure no update performed
    assert patches['PATCH-2']['status'] == 'SANDBOX_FAILED'
    assert len(events_table.put_items) == 0


def test_deploy_not_found(monkeypatch):
    getter, patches_table, events_table = fake_get_table_factory({})
    monkeypatch.setattr(tools, 'get_table', getter)

    res = tools.deploy_patch('MISSING')
    assert res.get('status') == 'error'
    assert 'not found' in res.get('message')


def test_rollback_success(monkeypatch):
    patches = {'PATCH-3': {'patchId': 'PATCH-3', 'status': 'DEPLOYED'}}
    getter, patches_table, events_table = fake_get_table_factory(patches)
    monkeypatch.setattr(tools, 'get_table', getter)

    res = tools.rollback_patch('PATCH-3', reason='test rollback')
    assert res.get('status') == 'ok'
    assert 'rolledBackAt' in res
    # Verify table status updated
    assert patches['PATCH-3']['status'] == 'ROLLED_BACK'
    # Event recorded
    assert len(events_table.put_items) >= 1
    evt = events_table.put_items[-1]
    assert evt['type'] == 'rollback'
    assert evt['patchId'] == 'PATCH-3'
