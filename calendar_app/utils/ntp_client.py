"""
🌐 NTP Client for Calendar Application

This module provides NTP time synchronization functionality with fallback mechanisms.
"""

import ntplib
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from dataclasses import dataclass

from version import DEFAULT_NTP_SERVERS, STATUS_EMOJIS

logger = logging.getLogger(__name__)


@dataclass
class NTPResult:
    """🌐 NTP synchronization result."""
    success: bool
    server: Optional[str] = None
    offset: float = 0.0
    delay: float = 0.0
    timestamp: Optional[datetime] = None
    error: Optional[str] = None
    
    def get_status_emoji(self) -> str:
        """📊 Get status emoji for result."""
        if self.success:
            return STATUS_EMOJIS["ntp_connected"]
        else:
            return STATUS_EMOJIS["ntp_disconnected"]


class NTPClient:
    """🌐 NTP protocol client for time synchronization."""
    
    def __init__(self, servers: Optional[List[str]] = None, timeout: float = 5.0):
        """Initialize NTP client with server list and timeout."""
        self.servers = servers or DEFAULT_NTP_SERVERS.copy()
        self.timeout = timeout
        self.client = ntplib.NTPClient()
        self._last_successful_server: Optional[str] = None
        
        logger.info(f"🌐 NTP Client initialized with {len(self.servers)} servers")
    
    def sync_time(self) -> NTPResult:
        """🔄 Synchronize time with NTP servers (blocking)."""
        logger.debug("🌐 Starting NTP synchronization...")
        
        # Try last successful server first
        if self._last_successful_server:
            result = self._try_server_sync(self._last_successful_server)
            if result.success:
                return result
        
        # Try all servers in order
        for server in self.servers:
            if server == self._last_successful_server:
                continue  # Already tried
            
            result = self._try_server_sync(server)
            if result.success:
                self._last_successful_server = server
                return result
        
        # All servers failed
        error_msg = f"All NTP servers failed (tried {len(self.servers)} servers)"
        logger.warning(f"⚠️ {error_msg}")
        return NTPResult(
            success=False,
            error=error_msg,
            timestamp=datetime.now(timezone.utc)
        )
    
    async def sync_time_async(self) -> NTPResult:
        """🔄 Synchronize time with NTP servers (async)."""
        logger.debug("🌐 Starting NTP synchronization...")
        
        # Try last successful server first
        if self._last_successful_server:
            result = await self._try_server(self._last_successful_server)
            if result.success:
                return result
        
        # Try all servers in order
        for server in self.servers:
            if server == self._last_successful_server:
                continue  # Already tried
            
            result = await self._try_server(server)
            if result.success:
                self._last_successful_server = server
                return result
        
        # All servers failed
        error_msg = f"All NTP servers failed (tried {len(self.servers)} servers)"
        logger.warning(f"⚠️ {error_msg}")
        return NTPResult(
            success=False,
            error=error_msg,
            timestamp=datetime.now(timezone.utc)
        )
    
    def _try_server_sync(self, server: str) -> NTPResult:
        """🔄 Try synchronizing with a specific server (blocking)."""
        try:
            logger.debug(f"🌐 Trying NTP server: {server}")
            
            # Make synchronous NTP request
            response = self.client.request(server, timeout=int(self.timeout))
            
            # Calculate time information
            ntp_time = datetime.fromtimestamp(response.tx_time, timezone.utc)
            local_time = datetime.now(timezone.utc)
            offset = response.offset
            delay = response.delay
            
            logger.info(f"✅ NTP sync successful: {server} (offset: {offset:.3f}s)")
            
            return NTPResult(
                success=True,
                server=server,
                offset=offset,
                delay=delay,
                timestamp=ntp_time
            )
            
        except ntplib.NTPException as e:
            logger.debug(f"❌ NTP error for {server}: {e}")
            return NTPResult(
                success=False,
                server=server,
                error=f"NTP error: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
        except OSError as e:
            logger.debug(f"❌ Network error for {server}: {e}")
            return NTPResult(
                success=False,
                server=server,
                error=f"Network error: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
        except Exception as e:
            logger.debug(f"❌ Unexpected error for {server}: {e}")
            return NTPResult(
                success=False,
                server=server,
                error=f"Unexpected error: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )

    async def _try_server(self, server: str) -> NTPResult:
        """🔄 Try synchronizing with a specific server (async)."""
        try:
            logger.debug(f"🌐 Trying NTP server: {server}")
            
            # Run NTP request in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.request(server, timeout=int(self.timeout))
            )
            
            # Calculate time information
            ntp_time = datetime.fromtimestamp(response.tx_time, timezone.utc)
            local_time = datetime.now(timezone.utc)
            offset = response.offset
            delay = response.delay
            
            logger.info(f"✅ NTP sync successful: {server} (offset: {offset:.3f}s)")
            
            return NTPResult(
                success=True,
                server=server,
                offset=offset,
                delay=delay,
                timestamp=ntp_time
            )
            
        except ntplib.NTPException as e:
            logger.debug(f"❌ NTP error for {server}: {e}")
            return NTPResult(
                success=False,
                server=server,
                error=f"NTP error: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
        except OSError as e:
            logger.debug(f"❌ Network error for {server}: {e}")
            return NTPResult(
                success=False,
                server=server,
                error=f"Network error: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
        except Exception as e:
            logger.debug(f"❌ Unexpected error for {server}: {e}")
            return NTPResult(
                success=False,
                server=server,
                error=f"Unexpected error: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
    
    def get_time_offset(self, ntp_result: NTPResult) -> float:
        """⏰ Get time offset from NTP result."""
        if ntp_result.success:
            return ntp_result.offset
        return 0.0
    
    def is_connected(self, ntp_result: NTPResult) -> bool:
        """🔗 Check if NTP synchronization is working."""
        return ntp_result.success
    
    def get_adjusted_time(self, ntp_result: Optional[NTPResult] = None) -> datetime:
        """🕐 Get current time adjusted for NTP offset."""
        if ntp_result and ntp_result.success:
            # Apply NTP offset to current time
            current_time = datetime.now(timezone.utc)
            adjusted_time = datetime.fromtimestamp(
                current_time.timestamp() + ntp_result.offset,
                timezone.utc
            )
            return adjusted_time
        else:
            # Fallback to system time
            return datetime.now(timezone.utc)
    
    def add_server(self, server: str):
        """➕ Add NTP server to the list."""
        if server not in self.servers:
            self.servers.append(server)
            logger.info(f"➕ Added NTP server: {server}")
    
    def remove_server(self, server: str):
        """➖ Remove NTP server from the list."""
        if server in self.servers:
            self.servers.remove(server)
            if self._last_successful_server == server:
                self._last_successful_server = None
            logger.info(f"➖ Removed NTP server: {server}")
    
    def get_server_list(self) -> List[str]:
        """📋 Get list of configured NTP servers."""
        return self.servers.copy()
    
    def reset_server_priority(self):
        """🔄 Reset server priority (clear last successful server)."""
        self._last_successful_server = None
        logger.debug("🔄 Reset NTP server priority")


class TimeManager:
    """⏰ High-level time management with NTP synchronization."""
    
    def __init__(self, ntp_servers: Optional[List[str]] = None, sync_interval: int = 300):
        """Initialize time manager."""
        self.ntp_client = NTPClient(ntp_servers)
        self.sync_interval = sync_interval  # seconds
        self._last_ntp_result: Optional[NTPResult] = None
        self._sync_task: Optional[asyncio.Task] = None
        self._is_running = False
        
        logger.info(f"⏰ Time Manager initialized (sync interval: {sync_interval}s)")
    
    async def start_sync(self):
        """🚀 Start background NTP synchronization."""
        if self._is_running:
            logger.warning("⚠️ Time sync already running")
            return
        
        self._is_running = True
        self._sync_task = asyncio.create_task(self._sync_loop())
        logger.info("🚀 Started NTP synchronization")
    
    async def stop_sync(self):
        """🛑 Stop background NTP synchronization."""
        self._is_running = False
        if self._sync_task:
            self._sync_task.cancel()
            try:
                await self._sync_task
            except asyncio.CancelledError:
                pass
            self._sync_task = None
        
        logger.info("🛑 Stopped NTP synchronization")
    
    async def _sync_loop(self):
        """🔄 Background synchronization loop."""
        while self._is_running:
            try:
                # Perform NTP sync
                result = await self.ntp_client.sync_time_async()
                self._last_ntp_result = result
                
                if result.success:
                    logger.debug(f"✅ NTP sync: {result.server} (offset: {result.offset:.3f}s)")
                else:
                    logger.debug(f"❌ NTP sync failed: {result.error}")
                
                # Wait for next sync
                await asyncio.sleep(self.sync_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Error in sync loop: {e}")
                await asyncio.sleep(min(self.sync_interval, 60))  # Wait at least 1 minute on error
    
    async def force_sync(self) -> NTPResult:
        """🔄 Force immediate NTP synchronization."""
        result = await self.ntp_client.sync_time_async()
        self._last_ntp_result = result
        return result
    
    def get_current_time(self) -> datetime:
        """🕐 Get current time (NTP adjusted or system fallback)."""
        return self.ntp_client.get_adjusted_time(self._last_ntp_result)
    
    def is_ntp_synced(self) -> bool:
        """🌐 Check if NTP synchronization is active."""
        return (self._last_ntp_result is not None and 
                self._last_ntp_result.success and
                self._is_running)
    
    def get_sync_status(self) -> dict:
        """📊 Get detailed synchronization status."""
        if self._last_ntp_result:
            return {
                'is_synced': self._last_ntp_result.success,
                'server': self._last_ntp_result.server,
                'offset': self._last_ntp_result.offset,
                'delay': self._last_ntp_result.delay,
                'last_sync': self._last_ntp_result.timestamp,
                'error': self._last_ntp_result.error,
                'emoji': self._last_ntp_result.get_status_emoji()
            }
        else:
            return {
                'is_synced': False,
                'server': None,
                'offset': 0.0,
                'delay': 0.0,
                'last_sync': None,
                'error': 'No sync attempted yet',
                'emoji': STATUS_EMOJIS["ntp_syncing"]
            }
    
    def set_sync_interval(self, interval_seconds: int):
        """⚙️ Set synchronization interval."""
        self.sync_interval = max(60, interval_seconds)  # Minimum 1 minute
        logger.info(f"⚙️ Set sync interval to {self.sync_interval}s")
    
    def get_ntp_servers(self) -> List[str]:
        """📋 Get list of NTP servers."""
        return self.ntp_client.get_server_list()
    
    def add_ntp_server(self, server: str):
        """➕ Add NTP server."""
        self.ntp_client.add_server(server)
    
    def remove_ntp_server(self, server: str):
        """➖ Remove NTP server."""
        self.ntp_client.remove_server(server)