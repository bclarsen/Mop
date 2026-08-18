import { addDoc, collection, doc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const notifsRef = collection(db, 'notifications');

/**
 * Creates notifications for task creation in team workspaces.
 *
 * Rules:
 * 1. A user NEVER receives notifications for tasks they create themselves.
 * 2. If assigned to a teammate: send notification to that teammate.
 * 3. If unassigned in team workspace: send notification to all other team members.
 */
export async function notifyTaskCreation({
  user,
  workspace,
  activeTeam,
  allAssignees = [],
  task,
}) {
  if (!user || workspace === 'personal' || !activeTeam) {
    return [];
  }

  const actorUid = user.uid;
  const actorName = user.displayName || user.email?.split('@')[0] || 'A teammate';
  const teamName = activeTeam.name || 'Team Workspace';
  const assignedTo = task.assignedTo;

  const notificationsToCreate = [];

  if (assignedTo) {
    // Assigned to someone
    if (assignedTo !== actorUid) {
      notificationsToCreate.push({
        recipientUid: assignedTo,
        actorUid,
        actorName,
        type: 'task_assigned',
        title: 'Task Assigned to You',
        message: `${actorName} assigned you "${task.name}" in ${teamName}`,
        taskId: task.id || '',
        taskName: task.name,
        room: task.room || 'General',
        teamId: workspace,
        teamName,
        read: false,
      });
    }
  } else {
    // Unassigned task in team workspace -> notify all other members
    const memberUids = new Set(activeTeam.members || []);
    allAssignees.forEach((a) => {
      if (a.uid && !a.isPending) memberUids.add(a.uid);
    });

    memberUids.forEach((memberUid) => {
      if (memberUid && memberUid !== actorUid) {
        notificationsToCreate.push({
          recipientUid: memberUid,
          actorUid,
          actorName,
          type: 'unassigned_task_created',
          title: 'New Unassigned Task',
          message: `${actorName} created an unassigned task: "${task.name}" in ${teamName}`,
          taskId: task.id || '',
          taskName: task.name,
          room: task.room || 'General',
          teamId: workspace,
          teamName,
          read: false,
        });
      }
    });
  }

  if (notificationsToCreate.length === 0) return [];

  if (!user.isDemo) {
    try {
      await Promise.all(
        notificationsToCreate.map((n) =>
          addDoc(notifsRef, {
            ...n,
            createdAt: serverTimestamp(),
          }),
        ),
      );
    } catch (err) {
      console.warn('Failed to save notifications to Firestore:', err);
    }
  }

  return notificationsToCreate;
}

export async function markNotificationRead(notifId, isDemo = false) {
  if (isDemo || !notifId) return;
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  } catch (err) {
    console.warn('Error marking notification read:', err);
  }
}

export async function deleteNotification(notifId, isDemo = false) {
  if (isDemo || !notifId) return;
  try {
    await deleteDoc(doc(db, 'notifications', notifId));
  } catch (err) {
    console.warn('Error deleting notification:', err);
  }
}
