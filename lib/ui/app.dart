import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../models/content.dart';
import '../services/controller.dart';
import '../services/api.dart';

const seshGreen = Color(0xff1ed760);

class SeshApp extends StatelessWidget {
  final SeshController controller;
  const SeshApp({super.key, required this.controller});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Sesh Music',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      brightness: Brightness.dark,
      useMaterial3: true,
      scaffoldBackgroundColor: const Color(0xff121212),
      colorScheme: ColorScheme.fromSeed(
        seedColor: seshGreen,
        brightness: Brightness.dark,
        primary: seshGreen,
        surface: const Color(0xff181818),
      ),
      cardTheme: const CardThemeData(color: Color(0xff202020), elevation: 0),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xff242424),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
      ),
    ),
    home: AppShell(controller: controller),
  );
}

class AppShell extends StatefulWidget {
  final SeshController controller;
  const AppShell({super.key, required this.controller});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int page = 0;
  String suggestedQuery = '';
  final List<MusicItem> history = [];
  SeshController get c => widget.controller;
  @override
  void initState() {
    super.initState();
    c.addListener(_update);
  }

  void _update() {
    if (!mounted) {
      return;
    }
    setState(() {});
    if (c.message != null) {
      final message = c.message!;
      c.message = null;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(message)));
        }
      });
    }
  }

  @override
  void dispose() {
    c.removeListener(_update);
    super.dispose();
  }

  void go(int value) => setState(() {
    page = value;
    history.clear();
  });
  void open(MusicItem item) => setState(() {
    history.add(item);
  });
  void search(String query) => setState(() {
    suggestedQuery = query;
    page = 1;
    history.clear();
  });
  Future<void> run(Future<void> Function() task) async {
    try {
      await task();
    } catch (error) {
      if (mounted) c.toast('$error');
    }
  }

  Future<void> addTracks(List<MusicItem> tracks) async {
    if (!c.api.connected) return;
    var chosen = await showDialog<MusicItem>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Add to playlist'),
        children: [
          for (final playlist in c.playlists.where(
            (p) => p.json['editable'] != false,
          ))
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, playlist),
              child: Text(playlist.title),
            ),
          SimpleDialogOption(
            onPressed: () =>
                Navigator.pop(context, const MusicItem({'id': '__create__'})),
            child: const Row(
              children: [
                Icon(Icons.add),
                SizedBox(width: 12),
                Text('Create a playlist'),
              ],
            ),
          ),
        ],
      ),
    );
    if (chosen?.id == '__create__') chosen = await createPlaylist();
    final target = chosen;
    if (target != null) await run(() => c.addToPlaylist(target, tracks));
  }

  Future<MusicItem?> createPlaylist() async {
    final previousIds = c.playlists.map((p) => p.id).toSet();
    final name = TextEditingController();
    bool public = false;
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, update) => AlertDialog(
          title: const Text('Create playlist'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                autofocus: true,
                decoration: const InputDecoration(labelText: 'Playlist name'),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Public playlist'),
                value: public,
                onChanged: (v) => update(() => public = v),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
    if (accepted == true && name.text.trim().isNotEmpty) {
      await run(() => c.createPlaylist(name.text.trim(), public));
    }
    // Dialog route finishes after its exit animation; controllers may still be in use until then.
    final created = c.playlists.where((p) => !previousIds.contains(p.id));
    return created.isEmpty ? null : created.first;
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final connected = c.api.connected;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Row(
                children: [
                  if (wide)
                    SizedBox(
                      width: 260,
                      child: ColoredBox(color: Colors.black, child: _sidebar()),
                    ),
                  Expanded(
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 12,
                          ),
                          child: Row(
                            children: [
                              if (history.isNotEmpty)
                                IconButton(
                                  tooltip: 'Back',
                                  onPressed: () => setState(() {
                                    history.removeLast();
                                  }),
                                  icon: const Icon(Icons.arrow_back),
                                ),
                              if (!wide)
                                const Icon(Icons.graphic_eq, color: seshGreen),
                              if (!wide) const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  history.isEmpty
                                      ? [
                                          'Good evening',
                                          'Search',
                                          'Your library',
                                          'Offline vault',
                                          'Activity',
                                          'Connection',
                                        ][page]
                                      : history.last.title,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w800,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (connected)
                                IconButton(
                                  tooltip: c.offlineMode
                                      ? 'Use online playback'
                                      : 'Use offline playback only',
                                  onPressed: () => setState(() {
                                    c.offlineMode = !c.offlineMode;
                                  }),
                                  icon: Icon(
                                    c.offlineMode ? Icons.wifi_off : Icons.wifi,
                                    color: c.offlineMode
                                        ? Colors.amber
                                        : seshGreen,
                                  ),
                                ),
                              IconButton(
                                tooltip: 'Connection settings',
                                onPressed: () => go(5),
                                icon: const Icon(Icons.account_circle_outlined),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: c.starting
                              ? const Center(child: CircularProgressIndicator())
                              : !connected
                              ? ConnectionPanel(controller: c)
                              : history.isNotEmpty
                              ? CollectionView(
                                  key: ValueKey(history.last.id),
                                  item: history.last,
                                  controller: c,
                                  onOpen: open,
                                  onAdd: addTracks,
                                  onError: (e) => c.toast('$e'),
                                )
                              : switch (page) {
                                  0 => _home(),
                                  1 => SearchView(
                                    key: ValueKey(suggestedQuery),
                                    controller: c,
                                    initialQuery: suggestedQuery,
                                    onOpen: open,
                                    onAdd: addTracks,
                                  ),
                                  2 => _library(),
                                  3 => _offline(),
                                  4 => _jobs(),
                                  _ => ConnectionPanel(controller: c),
                                },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            PlayerBar(controller: c),
            if (!wide)
              NavigationBar(
                selectedIndex: page > 3 ? 2 : page,
                onDestinationSelected: go,
                destinations: const [
                  NavigationDestination(
                    icon: Icon(Icons.home_outlined),
                    label: 'Home',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.search),
                    label: 'Search',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.library_music_outlined),
                    label: 'Library',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.download_done),
                    label: 'Offline',
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _sidebar() => Padding(
    padding: const EdgeInsets.all(16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(bottom: 24, top: 12),
          child: Row(
            children: [
              Icon(Icons.graphic_eq, color: seshGreen, size: 32),
              SizedBox(width: 10),
              Text(
                'sesh music',
                style: TextStyle(fontSize: 23, fontWeight: FontWeight.w900),
              ),
            ],
          ),
        ),
        for (final (index, icon, title) in <(int, IconData, String)>[
          (0, Icons.home_outlined, 'Home'),
          (1, Icons.search, 'Search'),
          (2, Icons.library_music_outlined, 'Your library'),
          (3, Icons.download_done, 'Offline vault'),
          (4, Icons.sync, 'Activity'),
        ])
          ListTile(
            selected: page == index && history.isEmpty,
            selectedColor: seshGreen,
            leading: Icon(icon),
            title: Text(title),
            onTap: () => go(index),
          ),
        const Divider(height: 32),
        Row(
          children: [
            const Expanded(
              child: Text(
                'PLAYLISTS',
                style: TextStyle(
                  color: Colors.white54,
                  fontSize: 12,
                  letterSpacing: 2,
                ),
              ),
            ),
            IconButton(
              tooltip: 'Create playlist',
              onPressed: c.api.connected ? createPlaylist : null,
              icon: const Icon(Icons.add),
            ),
          ],
        ),
        Expanded(
          child: ListView(
            children: [
              for (final item in c.playlists)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: Cover(controller: c, item: item, size: 36),
                  title: Text(
                    item.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  onTap: () => open(item),
                ),
            ],
          ),
        ),
        ListTile(
          leading: Icon(
            c.api.connected ? Icons.cloud_done : Icons.cloud_off,
            color: c.api.connected ? seshGreen : Colors.grey,
          ),
          title: Text(c.api.connected ? c.api.username : 'Connect server'),
          subtitle: const Text('Sesh Music', style: TextStyle(fontSize: 12)),
          onTap: () => go(5),
        ),
      ],
    ),
  );
  Widget _home() => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            colors: [Color(0xff164e39), Color(0xff202020)],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your music.\nOne place.',
              style: TextStyle(
                fontSize: 40,
                fontWeight: FontWeight.w900,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Explore your library and the upstream catalogue, build playlists, and take your music offline.',
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () => search(''),
              icon: const Icon(Icons.search),
              label: const Text('Discover music'),
            ),
          ],
        ),
      ),
      const SizedBox(height: 28),
      Row(
        children: [
          const Expanded(
            child: Text(
              'Your playlists',
              style: TextStyle(fontSize: 23, fontWeight: FontWeight.bold),
            ),
          ),
          TextButton.icon(
            onPressed: createPlaylist,
            icon: const Icon(Icons.add),
            label: const Text('Create'),
          ),
        ],
      ),
      if (c.playlists.isEmpty)
        const Padding(
          padding: EdgeInsets.all(20),
          child: Text(
            'Create your first playlist, or find an upstream playlist to save.',
          ),
        ),
      Wrap(
        spacing: 14,
        runSpacing: 14,
        children: c.playlists
            .take(8)
            .map(
              (item) => CollectionCard(
                item: item,
                controller: c,
                onTap: () => open(item),
              ),
            )
            .toList(),
      ),
      const SizedBox(height: 28),
      const Text(
        'Find your next session',
        style: TextStyle(fontSize: 23, fontWeight: FontWeight.bold),
      ),
      const SizedBox(height: 14),
      Wrap(
        spacing: 12,
        runSpacing: 12,
        children:
            [
                  'Ambient',
                  'Electronic',
                  'Chillwave',
                  'Jazz',
                  'Acoustic',
                  'Night drive',
                ]
                .map(
                  (genre) => ActionChip(
                    label: Text(genre),
                    onPressed: () => search(genre),
                  ),
                )
                .toList(),
      ),
    ],
  );
  Widget _library() => Column(
    children: [
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Wrap(
          spacing: 12,
          children: [
            FilledButton.icon(
              onPressed: createPlaylist,
              icon: const Icon(Icons.add),
              label: const Text('Create playlist'),
            ),
            OutlinedButton.icon(
              onPressed: () => go(4),
              icon: const Icon(Icons.sync),
              label: const Text('Acquisition activity'),
            ),
          ],
        ),
      ),
      Expanded(
        child: SearchView(
          controller: c,
          initialQuery: '',
          libraryBrowse: true,
          onOpen: open,
          onAdd: addTracks,
        ),
      ),
    ],
  );
  Widget _offline() => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      if (kIsWeb)
        const Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Browser preview: audio is stored in IndexedDB. Browser storage can be cleared or evicted. Android uses private app files with resumable transfers.',
            ),
          ),
        ),
      SwitchListTile(
        title: const Text('Offline playback only'),
        subtitle: Text(
          '${c.offlineRecords.length} verified tracks on this device',
        ),
        value: c.offlineMode,
        onChanged: (v) => setState(() {
          c.offlineMode = v;
        }),
      ),
      for (final record in c.offlineRecords)
        TrackRow(
          item: MusicItem(Map<String, dynamic>.from(record['track'])),
          controller: c,
          onPlay: () => c.play(
            MusicItem(Map<String, dynamic>.from(record['track'])),
            tracks: c.offlineRecords
                .map((r) => MusicItem(Map<String, dynamic>.from(r['track'])))
                .toList(),
          ),
          onAdd: addTracks,
          trailing: IconButton(
            tooltip: 'Remove device copy',
            icon: const Icon(Icons.delete_outline),
            onPressed: () => run(() async {
              final track = MusicItem(
                Map<String, dynamic>.from(record['track']),
              );
              await c.offline!.remove(track.id);
              c.offlineRecords = await c.offline!.records();
              c.toast('Device copy removed; server copy retained');
            }),
          ),
        ),
      if (c.offlineRecords.isEmpty)
        const EmptyState(
          icon: Icons.download_outlined,
          title: 'Take your music with you',
          message:
              'Choose Download for Offline on a track or collection. A permanent server copy is saved first.',
        ),
      if (c.transfers.isNotEmpty)
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 16),
          child: Text(
            'Device transfers',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
        ),
      for (final entry in c.transfers.entries)
        _transfer(entry.key, entry.value),
    ],
  );
  Widget _transfer(String id, Json transfer) {
    final total = intValue(transfer['total']);
    final bytes = intValue(transfer['bytes']);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${transfer['title']}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            Text(
              '${transfer['state']} · ${(bytes / 1048576).toStringAsFixed(1)} MB',
            ),
            if (transfer['state'] == 'downloading')
              LinearProgressIndicator(value: total > 0 ? bytes / total : null),
            if (transfer['error'] != null)
              Text(
                '${transfer['error']}',
                style: const TextStyle(color: Colors.orangeAccent),
              ),
            if (transfer['state'] == 'downloading')
              TextButton(
                onPressed: () => c.cancelTransfer(id),
                child: const Text('Cancel device transfer'),
              ),
            if (['failed', 'cancelled'].contains(transfer['state']))
              TextButton(
                onPressed: () => run(() => c.retryTransfer(id)),
                child: const Text('Retry device transfer'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _jobs() => RefreshIndicator(
    onRefresh: c.refreshJobs,
    child: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const Text(
          'Server activity',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        for (final job in c.jobs)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${job['name'] ?? job['type'] ?? 'Acquisition'}',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${job['state']} · ${job['completedTracks'] ?? job['completed'] ?? 0}/${job['totalTracks'] ?? job['total'] ?? 0} tracks · ${job['phase'] ?? ''}',
                  ),
                  if (job['currentTrack'] is Map)
                    Text(
                      '${job['currentTrack']['title']} · ${job['currentTrack']['artistName'] ?? ''}',
                    ),
                  if (['queued', 'running'].contains(job['state']))
                    const LinearProgressIndicator(),
                  if (job['error'] != null)
                    Text(
                      job['error'] is Map
                          ? '${job['error']['message']}'
                          : '${job['error']}',
                      style: const TextStyle(color: Colors.orangeAccent),
                    ),
                  Row(
                    children: [
                      if (['queued', 'running'].contains(job['state']))
                        TextButton(
                          onPressed: () =>
                              run(() => c.jobAction('${job['id']}', 'cancel')),
                          child: const Text('Cancel'),
                        ),
                      if ([
                        'failed',
                        'cancelled',
                        'interrupted',
                      ].contains(job['state']))
                        TextButton(
                          onPressed: () =>
                              run(() => c.jobAction('${job['id']}', 'retry')),
                          child: const Text('Retry'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        if (c.jobs.isEmpty)
          const EmptyState(
            icon: Icons.sync,
            title: 'Nothing queued',
            message: 'Playlist saves and offline acquisition jobs appear here.',
          ),
        if (c.transfers.isNotEmpty)
          TextButton(
            onPressed: () => go(3),
            child: const Text('View device transfers'),
          ),
      ],
    ),
  );
}

class ConnectionPanel extends StatefulWidget {
  final SeshController controller;
  const ConnectionPanel({super.key, required this.controller});
  @override
  State<ConnectionPanel> createState() => _ConnectionPanelState();
}

class _ConnectionPanelState extends State<ConnectionPanel> {
  late String environment = SeshEnvironment.forServer(
    widget.controller.api.baseUrl,
  );
  late final TextEditingController username = TextEditingController(
    text: widget.controller.api.username,
  );
  final password = TextEditingController();
  String? error;
  bool remember = true;
  @override
  void dispose() {
    username.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> connect() async {
    if (widget.controller.busy) return;
    setState(() {
      error = null;
    });
    try {
      await widget.controller.connect(
        SeshEnvironment.url(environment),
        username.text,
        password.text,
        remember,
      );
      password.clear();
    } catch (e) {
      if (mounted) {
        setState(() {
          error = '$e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              const Icon(Icons.graphic_eq, size: 64, color: seshGreen),
              const SizedBox(height: 20),
              const Text(
                'Connect to your music',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              const Text(
                'Use your Sesh Music account. Search your library and upstream catalogue through one connection.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),
              DropdownButtonFormField<String>(
                key: const Key('server-environment'),
                initialValue: environment,
                decoration: const InputDecoration(
                  labelText: 'Environment',
                  prefixIcon: Icon(Icons.dns_outlined),
                ),
                items: const [
                  DropdownMenuItem(value: 'live', child: Text('live')),
                  DropdownMenuItem(
                    value: 'development',
                    child: Text('development'),
                  ),
                ],
                onChanged: widget.controller.busy
                    ? null
                    : (value) {
                        if (value != null) setState(() => environment = value);
                      },
              ),
              const SizedBox(height: 16),
              TextField(
                key: const Key('username'),
                controller: username,
                autofillHints: const [AutofillHints.username],
                decoration: const InputDecoration(
                  labelText: 'Username',
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                key: const Key('password'),
                controller: password,
                obscureText: true,
                autofillHints: const [AutofillHints.password],
                decoration: const InputDecoration(
                  labelText: 'Password',
                  prefixIcon: Icon(Icons.lock_outline),
                ),
                onSubmitted: (_) => connect(),
              ),
              if (!kIsWeb)
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Remember securely on this device'),
                  value: remember,
                  onChanged: (v) => setState(() {
                    remember = v ?? false;
                  }),
                ),
              if (kIsWeb)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    'Browser preview keeps your password in memory only. Reconnect after reloading.',
                    style: TextStyle(color: Colors.white54),
                  ),
                ),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    error!,
                    style: const TextStyle(color: Colors.orangeAccent),
                  ),
                ),
              FilledButton.icon(
                onPressed: widget.controller.busy ? null : connect,
                icon: widget.controller.busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.login),
                label: const Text('Connect'),
              ),
              if (widget.controller.api.connected)
                TextButton(
                  onPressed: () async {
                    await widget.controller.logout();
                  },
                  child: const Text('Disconnect and forget credentials'),
                ),
              const SizedBox(height: 24),
              const Text(
                'No sample tracks or synthetic audio are substituted for your library.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white38),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

class Cover extends StatelessWidget {
  final MusicItem item;
  final SeshController controller;
  final double size;
  const Cover({
    super.key,
    required this.item,
    required this.controller,
    this.size = 48,
  });
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(8),
    child: SizedBox(
      width: size,
      height: size,
      child: item.artworkPath.isEmpty || controller.offlineMode
          ? _placeholder()
          : Image.network(
              controller.api.mediaUri(item.artworkPath).toString(),
              fit: BoxFit.cover,
              errorBuilder: (_, error, stack) => _placeholder(),
            ),
    ),
  );
  Widget _placeholder() => ColoredBox(
    color: const Color(0xff303030),
    child: Icon(
      item.kind == 'artist'
          ? Icons.person
          : item.kind == 'playlist'
          ? Icons.queue_music
          : Icons.music_note,
      color: Colors.white38,
      size: size * .45,
    ),
  );
}

class CollectionCard extends StatelessWidget {
  final MusicItem item;
  final SeshController controller;
  final VoidCallback onTap;
  const CollectionCard({
    super.key,
    required this.item,
    required this.controller,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 160,
    child: Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Cover(item: item, controller: controller, size: 136),
              const SizedBox(height: 12),
              Text(
                item.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              Text(
                item.subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white54, fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class TrackRow extends StatelessWidget {
  final MusicItem item;
  final SeshController controller;
  final VoidCallback onPlay;
  final Future<void> Function(List<MusicItem>) onAdd;
  final Widget? trailing;
  final Future<void> Function()? onRemove;
  final void Function(MusicItem)? onOpen;
  const TrackRow({
    super.key,
    required this.item,
    required this.controller,
    required this.onPlay,
    required this.onAdd,
    this.trailing,
    this.onRemove,
    this.onOpen,
  });
  Future<void> _action(String action) async {
    try {
      switch (action) {
        case 'remove':
          await onRemove?.call();
        case 'play':
          onPlay();
        case 'add':
          await onAdd([item]);
        case 'offline':
          await controller.downloadOffline([item]);
        case 'favorite':
          await controller.setFavorite(item);
        case 'album':
          if (item.album['id'] != null) {
            onOpen?.call(
              MusicItem({
                ...item.album,
                'kind': 'album',
                'source': item.source,
              }),
            );
          }
      }
    } catch (error) {
      controller.toast('$error');
    }
  }

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
    leading: Cover(item: item, controller: controller),
    title: Text(
      item.title,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        color: controller.current?.id == item.id ? seshGreen : null,
      ),
    ),
    subtitle: Text(
      '${item.artistName}${item.artistName.isEmpty ? '' : ' · '}${item.source == 'upstream' ? 'Upstream' : 'Library'}${controller.isOffline(item.id) ? ' · Offline' : ''}',
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    ),
    onTap: onPlay,
    trailing:
        trailing ??
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (MediaQuery.sizeOf(context).width > 500)
              Text(
                durationLabel(item.durationMs),
                style: const TextStyle(color: Colors.white54),
              ),
            PopupMenuButton<String>(
              tooltip: 'Track actions',
              onSelected: _action,
              itemBuilder: (_) => [
                const PopupMenuItem(value: 'play', child: Text('Play')),
                const PopupMenuItem(
                  value: 'add',
                  child: Text('Add to playlist'),
                ),
                PopupMenuItem(
                  value: 'offline',
                  child: Text(
                    controller.isOffline(item.id)
                        ? 'Downloaded for Offline'
                        : 'Download for Offline',
                  ),
                ),
                if (item.source == 'library')
                  PopupMenuItem(
                    value: 'favorite',
                    child: Text(
                      controller.isFavorite(item)
                          ? 'Remove favourite'
                          : 'Favourite',
                    ),
                  ),
                if (item.album['id'] != null && onOpen != null)
                  const PopupMenuItem(
                    value: 'album',
                    child: Text('Go to album'),
                  ),
                if (onRemove != null)
                  const PopupMenuItem(
                    value: 'remove',
                    child: Text('Remove from playlist'),
                  ),
              ],
            ),
          ],
        ),
  );
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
  });
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 48),
    child: Column(
      children: [
        Icon(icon, size: 56, color: Colors.white38),
        const SizedBox(height: 16),
        Text(
          title,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.white54),
        ),
      ],
    ),
  );
}

class SearchView extends StatefulWidget {
  final SeshController controller;
  final String initialQuery;
  final bool libraryBrowse;
  final void Function(MusicItem) onOpen;
  final Future<void> Function(List<MusicItem>) onAdd;
  const SearchView({
    super.key,
    required this.controller,
    required this.initialQuery,
    this.libraryBrowse = false,
    required this.onOpen,
    required this.onAdd,
  });
  @override
  State<SearchView> createState() => _SearchViewState();
}

class _SearchViewState extends State<SearchView> {
  late final TextEditingController query = TextEditingController(
    text: widget.initialQuery,
  );
  String source = 'all';
  String kind = 'track';
  bool loading = false;
  String? error;
  String submitted = '';
  int generation = 0;
  final Map<String, List<Json>> results = {};
  final Map<String, String?> cursors = {};
  final Map<String, List<Json>> warnings = {};
  final Set<String> loadingMore = {};
  static const kinds = ['track', 'artist', 'album', 'playlist'];
  @override
  void initState() {
    super.initState();
    if (widget.libraryBrowse) {
      source = 'library';
      kind = 'album';
    }
    if (query.text.isNotEmpty || widget.libraryBrowse) {
      unawaited(search());
    }
  }

  @override
  void dispose() {
    generation++;
    query.dispose();
    super.dispose();
  }

  Future<void> search() async {
    final text = query.text.trim();
    if (text.isEmpty && !widget.libraryBrowse) {
      return;
    }
    final current = ++generation;
    setState(() {
      loading = true;
      error = null;
      submitted = text;
      results.clear();
      cursors.clear();
      warnings.clear();
    });
    if (widget.controller.offlineMode) {
      final items = widget.controller.offlineRecords
          .map((r) => Map<String, dynamic>.from(r['track']))
          .where(
            (r) => '${r['title']} ${r['artist']}'.toLowerCase().contains(
              text.toLowerCase(),
            ),
          )
          .toList();
      setState(() {
        results['track:library'] = items;
        kind = 'track';
        loading = false;
      });
      return;
    }
    final selectedSource = source;
    await Future.wait(
      kinds.map((type) async {
        try {
          final data = await widget.controller.api.get('/search', {
            'q': text,
            'kind': type,
            'source': selectedSource,
            'limit': '25',
          });
          if (!mounted || current != generation) {
            return;
          }
          setState(() {
            for (final group in jsonList(data['groups'])) {
              final key = '$type:${group['source']}';
              results[key] = jsonList(group['items']);
              cursors[key] = group['nextCursor'] as String?;
            }
            warnings[type] = jsonList(data['warnings']);
          });
        } catch (e) {
          if (mounted && current == generation) {
            setState(() {
              error = '$e';
            });
          }
        }
      }),
    );
    if (mounted && current == generation) {
      setState(() {
        loading = false;
      });
    }
  }

  Future<void> more(String groupSource) async {
    final key = '$kind:$groupSource';
    final cursor = cursors[key];
    if (cursor == null || loadingMore.contains(key)) {
      return;
    }
    final current = generation;
    final selectedKind = kind;
    setState(() {
      loadingMore.add(key);
    });
    try {
      final data = await widget.controller.api.get('/search', {
        'q': submitted,
        'kind': selectedKind,
        'source': groupSource,
        'cursor': cursor,
        'limit': '25',
      });
      if (!mounted || current != generation) {
        return;
      }
      setState(() {
        for (final group in jsonList(data['groups'])) {
          final groupKey = '$selectedKind:${group['source']}';
          final existing = results[groupKey] ?? [];
          final ids = existing.map((e) => e['id']).toSet();
          results[groupKey] = [
            ...existing,
            ...jsonList(group['items']).where((e) => ids.add(e['id'])),
          ];
          cursors[groupKey] = group['nextCursor'] as String?;
        }
      });
    } catch (e) {
      widget.controller.toast('$e');
    } finally {
      if (mounted) {
        setState(() {
          loadingMore.remove(key);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      TextField(
        key: const Key('search-query'),
        controller: query,
        onSubmitted: (_) => search(),
        decoration: InputDecoration(
          hintText: widget.libraryBrowse
              ? 'Filter your library…'
              : 'What do you want to play?',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: IconButton(
            tooltip: 'Search',
            onPressed: search,
            icon: const Icon(Icons.arrow_forward),
          ),
        ),
      ),
      const SizedBox(height: 16),
      if (!widget.libraryBrowse)
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: ['all', 'library', 'upstream']
              .map(
                (value) => ChoiceChip(
                  label: Text(
                    value == 'all'
                        ? 'All sources'
                        : value == 'library'
                        ? 'Library'
                        : 'Upstream',
                  ),
                  selected: source == value,
                  onSelected: (_) {
                    setState(() {
                      source = value;
                    });
                    if (query.text.trim().isNotEmpty) {
                      unawaited(search());
                    }
                  },
                ),
              )
              .toList(),
        ),
      const SizedBox(height: 16),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: kinds.map((value) {
          final count = results.entries
              .where((e) => e.key.startsWith('$value:'))
              .fold<int>(0, (sum, e) => sum + e.value.length);
          final label = {
            'track': 'Tracks',
            'artist': 'Artists',
            'album': 'Albums',
            'playlist': 'Playlists',
          }[value]!;
          return ChoiceChip(
            label: Text(
              '$label${submitted.isEmpty && !widget.libraryBrowse ? '' : ' ($count)'}',
            ),
            selected: kind == value,
            onSelected: (_) => setState(() {
              kind = value;
            }),
          );
        }).toList(),
      ),
      const SizedBox(height: 20),
      if (loading) const LinearProgressIndicator(),
      if (error != null)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Text(
            error!,
            style: const TextStyle(color: Colors.orangeAccent),
          ),
        ),
      for (final warning in warnings[kind] ?? <Json>[])
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Text('${warning['message']}'),
          ),
        ),
      if (submitted.isEmpty && !widget.libraryBrowse)
        const EmptyState(
          icon: Icons.search,
          title: 'Find your next session',
          message:
              'Search tracks, artists, albums and playlists across your library and upstream catalogue.',
        ),
      for (final groupSource in ['library', 'upstream'])
        if (results.containsKey('$kind:$groupSource')) ...[
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Text(
              groupSource == 'library' ? 'Your library' : 'Upstream catalogue',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
          ),
          if ((results['$kind:$groupSource'] ?? []).isEmpty && !loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'No matching results',
                style: TextStyle(color: Colors.white54),
              ),
            ),
          if (kind == 'track') ...[
            for (final json in results['$kind:$groupSource'] ?? <Json>[])
              TrackRow(
                item: MusicItem(json),
                controller: widget.controller,
                onPlay: () => widget.controller.play(
                  MusicItem(json),
                  tracks: (results['$kind:$groupSource'] ?? [])
                      .map(MusicItem.new)
                      .toList(),
                ),
                onAdd: widget.onAdd,
                onOpen: widget.onOpen,
              ),
          ] else
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: (results['$kind:$groupSource'] ?? [])
                  .map(
                    (json) => CollectionCard(
                      item: MusicItem(json),
                      controller: widget.controller,
                      onTap: () => widget.onOpen(MusicItem(json)),
                    ),
                  )
                  .toList(),
            ),
          if (cursors['$kind:$groupSource'] != null)
            Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.only(top: 16),
                child: OutlinedButton.icon(
                  onPressed: loadingMore.contains('$kind:$groupSource')
                      ? null
                      : () => more(groupSource),
                  icon: const Icon(Icons.expand_more),
                  label: Text(
                    loadingMore.contains('$kind:$groupSource')
                        ? 'Loading…'
                        : 'Load more',
                  ),
                ),
              ),
            ),
        ],
    ],
  );
}

class CollectionView extends StatefulWidget {
  final MusicItem item;
  final SeshController controller;
  final void Function(MusicItem) onOpen;
  final Future<void> Function(List<MusicItem>) onAdd;
  final void Function(Object) onError;
  const CollectionView({
    super.key,
    required this.item,
    required this.controller,
    required this.onOpen,
    required this.onAdd,
    required this.onError,
  });
  @override
  State<CollectionView> createState() => _CollectionViewState();
}

class _CollectionViewState extends State<CollectionView> {
  late MusicItem metadata = widget.item;
  List<Json> items = [];
  String? cursor;
  bool loading = true;
  bool acting = false;
  String? error;
  bool get playlist => metadata.kind == 'playlist';
  bool get editable =>
      playlist &&
      metadata.source == 'library' &&
      metadata.json['editable'] != false;
  SeshController get c => widget.controller;
  String get base =>
      '/${metadata.kind == 'artist'
          ? 'artists'
          : playlist
          ? 'playlists'
          : 'albums'}/${Uri.encodeComponent(metadata.id)}';
  @override
  void initState() {
    super.initState();
    unawaited(load(reset: true));
  }

  Future<void> load({bool reset = false}) async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      if (reset) {
        metadata = MusicItem(await c.api.get(base));
      }
      final endpoint = metadata.kind == 'artist'
          ? 'albums'
          : playlist
          ? 'entries'
          : 'tracks';
      final data = await c.api.get('$base/$endpoint', {
        'limit': '100',
        if (!reset && cursor != null) 'cursor': cursor!,
      });
      if (!mounted) {
        return;
      }
      setState(() {
        if (data['revision'] != null) {
          metadata = MusicItem({
            ...metadata.json,
            'revision': data['revision'],
          });
        }
        items = reset
            ? jsonList(data['items'])
            : [...items, ...jsonList(data['items'])];
        cursor = data['nextCursor'] as String?;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          error = '$e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  List<MusicItem> get tracks => items
      .map(
        (e) => MusicItem(
          e['track'] is Map ? Map<String, dynamic>.from(e['track']) : e,
        ),
      )
      .toList();
  Future<void> action(Future<void> Function() callback) async {
    setState(() {
      acting = true;
    });
    try {
      await callback();
    } catch (e) {
      widget.onError(e);
    } finally {
      if (mounted) {
        setState(() {
          acting = false;
        });
      }
    }
  }

  Future<void> removeEntry(String entryId) => action(() async {
    await c.api.request(
      'DELETE',
      '$base/entries/${Uri.encodeComponent(entryId)}',
      parameters: {'revision': '${metadata.json['revision']}'},
    );
    await c.refreshPlaylists();
    await load(reset: true);
  });

  Future<void> reorder(int from, int to) async {
    if (to > from) {
      to--;
    }
    final reordered = [...items];
    reordered.insert(to, reordered.removeAt(from));
    await action(() async {
      await c.api.patch('$base/entries', {
        'revision': metadata.json['revision'],
        'entryIds': reordered.map((e) => e['entryId']).toList(),
      });
      await load(reset: true);
    });
  }

  Future<void> edit() async {
    final name = TextEditingController(text: metadata.title);
    bool public = metadata.json['public'] == true;
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, update) => AlertDialog(
          title: const Text('Edit playlist'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Name'),
              ),
              SwitchListTile(
                title: const Text('Public'),
                value: public,
                onChanged: (v) => update(() {
                  public = v;
                }),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    if (accepted == true && name.text.trim().isNotEmpty) {
      await action(() async {
        await c.api.patch(base, {
          'revision': metadata.json['revision'],
          'name': name.text.trim(),
          'public': public,
        });
        await c.refreshPlaylists();
        await load(reset: true);
      });
    }
  }

  Future<void> deletePlaylist() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete playlist?'),
        content: const Text('The saved music remains in your library.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await action(() async {
        await c.api.request(
          'DELETE',
          base,
          parameters: {'revision': '${metadata.json['revision']}'},
        );
        await c.refreshPlaylists();
        if (mounted) {
          setState(() {
            items = [];
            error = 'This playlist was deleted. Use Back to return.';
          });
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      Wrap(
        spacing: 24,
        runSpacing: 20,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Cover(item: metadata, controller: c, size: 160),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${metadata.kind.toUpperCase()} · ${metadata.source == 'upstream' ? 'UPSTREAM' : 'LIBRARY'}',
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 12,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: MediaQuery.sizeOf(context).width < 600
                    ? MediaQuery.sizeOf(context).width - 70
                    : 450,
                child: Text(
                  metadata.title,
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(metadata.subtitle),
            ],
          ),
        ],
      ),
      const SizedBox(height: 24),
      if (metadata.kind == 'artist' && metadata.biography.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: SelectableText(metadata.biography),
        ),
      if (metadata.kind != 'artist')
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            FilledButton.icon(
              onPressed: acting || items.isEmpty
                  ? null
                  : () => action(() async {
                      final all = await c.collectionTracks(metadata);
                      if (all.isNotEmpty) {
                        await c.play(all.first, tracks: all);
                      }
                    }),
              icon: const Icon(Icons.play_arrow),
              label: const Text('Play all'),
            ),
            OutlinedButton.icon(
              onPressed: acting || items.isEmpty
                  ? null
                  : () => action(() async {
                      await c.downloadOffline(
                        await c.collectionTracks(metadata),
                        album: metadata.kind == 'album' ? metadata : null,
                      );
                    }),
              icon: const Icon(Icons.download),
              label: const Text('Download for Offline'),
            ),
            if (playlist && metadata.source == 'upstream')
              OutlinedButton.icon(
                onPressed: acting
                    ? null
                    : () => action(() => c.importPlaylist(metadata)),
                icon: const Icon(Icons.library_add),
                label: const Text('Save Entire Playlist'),
              ),
            if (editable)
              OutlinedButton.icon(
                onPressed: acting ? null : edit,
                icon: const Icon(Icons.edit_outlined),
                label: const Text('Edit'),
              ),
            if (editable)
              IconButton(
                tooltip: 'Delete playlist',
                icon: const Icon(Icons.delete_outline),
                onPressed: acting ? null : deletePlaylist,
              ),
          ],
        ),
      if (acting || loading)
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 16),
          child: LinearProgressIndicator(),
        ),
      if (error != null)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Text(
            error!,
            style: const TextStyle(color: Colors.orangeAccent),
          ),
        ),
      const SizedBox(height: 20),
      if (metadata.kind == 'artist')
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: items
              .map(
                (item) => CollectionCard(
                  item: MusicItem(item),
                  controller: c,
                  onTap: () => widget.onOpen(MusicItem(item)),
                ),
              )
              .toList(),
        )
      else if (editable && cursor == null && items.isNotEmpty) ...[
        const Text(
          'Drag the handle to reorder. Repeated tracks are kept as separate entries.',
          style: TextStyle(color: Colors.white54, fontSize: 12),
        ),
        ReorderableListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          buildDefaultDragHandles: false,
          itemCount: items.length,
          onReorder: reorder,
          itemBuilder: (context, index) {
            final entry = PlaylistEntry.fromJson(items[index]);
            return Row(
              key: ValueKey(entry.id),
              children: [
                Expanded(
                  child: TrackRow(
                    item: entry.track,
                    controller: c,
                    onPlay: () =>
                        c.play(entry.track, tracks: tracks, index: index),
                    onAdd: widget.onAdd,
                    onOpen: widget.onOpen,
                    onRemove: acting ? null : () => removeEntry(entry.id),
                  ),
                ),
                ReorderableDragStartListener(
                  index: index,
                  child: const Padding(
                    padding: EdgeInsets.all(12),
                    child: Icon(Icons.drag_handle, color: Colors.white54),
                  ),
                ),
              ],
            );
          },
        ),
      ] else
        for (final (index, track) in tracks.indexed)
          TrackRow(
            item: track,
            controller: c,
            onPlay: () => c.play(track, tracks: tracks, index: index),
            onAdd: widget.onAdd,
            onOpen: widget.onOpen,
            onRemove: editable && !acting
                ? () => removeEntry(PlaylistEntry.fromJson(items[index]).id)
                : null,
          ),
      if (cursor != null)
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(
            onPressed: loading ? null : () => load(),
            icon: const Icon(Icons.expand_more),
            label: const Text('Load more'),
          ),
        ),
    ],
  );
}

class PlayerBar extends StatelessWidget {
  final SeshController controller;
  const PlayerBar({super.key, required this.controller});
  @override
  Widget build(BuildContext context) {
    final c = controller;
    final item = c.current;
    if (item == null) return const SizedBox.shrink();
    final wide = MediaQuery.sizeOf(context).width > 700;
    final preparing = c.playbackState == 'preparing';
    return Material(
      color: const Color(0xff202020),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (preparing) const LinearProgressIndicator(minHeight: 2),
            if (c.playbackError != null)
              Row(
                children: [
                  const Icon(
                    Icons.error_outline,
                    color: Colors.orangeAccent,
                    size: 18,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      c.playbackError!,
                      maxLines: 2,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.orangeAccent,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: c.togglePlay,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            if (c.playbackNotice != null)
              Text(
                c.playbackNotice!,
                style: const TextStyle(fontSize: 11, color: Colors.amber),
              ),
            Row(
              children: [
                Cover(item: item, controller: c, size: 44),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        preparing ? 'Preparing full track…' : item.artistName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white54,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Previous',
                  onPressed:
                      c.queueIndex > 0 || c.audio.player.position.inSeconds > 3
                      ? c.previous
                      : null,
                  icon: const Icon(Icons.skip_previous),
                ),
                IconButton.filled(
                  tooltip: c.audio.player.playing ? 'Pause' : 'Play',
                  onPressed: preparing ? null : c.togglePlay,
                  icon: Icon(
                    c.audio.player.playing ? Icons.pause : Icons.play_arrow,
                  ),
                ),
                IconButton(
                  tooltip: 'Next',
                  onPressed: c.queueIndex + 1 < c.queue.length ? c.next : null,
                  icon: const Icon(Icons.skip_next),
                ),
                if (wide) ...[
                  const Icon(Icons.volume_up, size: 18),
                  SizedBox(
                    width: 100,
                    child: Slider(
                      value: c.audio.player.volume,
                      onChanged: (v) => c.audio.player.setVolume(v),
                    ),
                  ),
                ],
                IconButton(
                  tooltip: 'Play queue',
                  onPressed: () => showModalBottomSheet<void>(
                    context: context,
                    builder: (context) => ListView(
                      children: [
                        const ListTile(title: Text('Play queue')),
                        for (var i = 0; i < c.queue.length; i++)
                          ListTile(
                            selected: c.queueIndex == i,
                            title: Text(c.queue[i].title),
                            subtitle: Text(c.queue[i].artistName),
                            onTap: () {
                              c.queueIndex = i;
                              c.play(c.queue[i], tracks: c.queue, index: i);
                              Navigator.pop(context);
                            },
                          ),
                      ],
                    ),
                  ),
                  icon: const Icon(Icons.queue_music),
                ),
              ],
            ),
            StreamBuilder<Duration>(
              stream: c.audio.player.positionStream,
              builder: (context, snapshot) {
                final position = snapshot.data ?? Duration.zero;
                final total =
                    c.audio.player.duration?.inMilliseconds ?? item.durationMs;
                return Row(
                  children: [
                    Text(
                      durationLabel(position.inMilliseconds),
                      style: const TextStyle(
                        fontSize: 10,
                        color: Colors.white54,
                      ),
                    ),
                    Expanded(
                      child: Slider(
                        min: 0,
                        max: total > 0 ? total.toDouble() : 1,
                        value: position.inMilliseconds.toDouble().clamp(
                          0,
                          total > 0 ? total.toDouble() : 1,
                        ),
                        onChanged: preparing || total <= 0
                            ? null
                            : (v) => c.audio.seek(
                                Duration(milliseconds: v.toInt()),
                              ),
                      ),
                    ),
                    Text(
                      durationLabel(total),
                      style: const TextStyle(
                        fontSize: 10,
                        color: Colors.white54,
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
