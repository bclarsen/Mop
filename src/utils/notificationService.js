import { addDoc, collection, doc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const notifsRef = collection(db, 'notifications');
const mailRef = collection(db, 'mail');

async function createNotificationWithEmail(notificationData, allAssignees, sendEmail = true) {
  try {
    const promises = [];

    // 1. Create in-app notification
    promises.push(
      addDoc(notifsRef, {
        ...notificationData,
        createdAt: serverTimestamp(),
      })
    );

    // 2. Create email document for Firebase "Trigger Email" extension
    const recipient = allAssignees.find(a => a.uid === notificationData.recipientUid);
    if (sendEmail && recipient && recipient.email) {
      promises.push(
        addDoc(mailRef, {
          to: recipient.email,
          message: {
            subject: notificationData.title,
            html: `<p>${notificationData.message}</p>`,
          }
        })
      );
    }

    await Promise.all(promises);
  } catch (err) {
    console.warn('Failed to save notification/email:', err);
  }
}

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
  if (!user || workspace === 'personal' || !activeTeam || user.isDemo) {
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

  if (notificationsToCreate.length > 0) {
    const sendEmail = activeTeam?.preferences?.emailTaskAssignments ?? true;
    await Promise.all(
      notificationsToCreate.map((n) => createNotificationWithEmail(n, allAssignees, sendEmail))
    );
  }

  return notificationsToCreate;
}

/**
 * Creates notifications when a task is completed in a team workspace.
 * Notifies all other members of the workspace.
 */
export async function notifyTaskCompletion({
  user,
  workspace,
  activeTeam,
  allAssignees = [],
  task,
}) {
  if (!user || workspace === 'personal' || !activeTeam || user.isDemo) {
    return [];
  }

  const actorUid = user.uid;
  const actorName = user.displayName || user.email?.split('@')[0] || 'A teammate';
  const teamName = activeTeam.name || 'Team Workspace';

  const notificationsToCreate = [];
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
        type: 'task_completed',
        title: 'Task Completed',
        message: `${actorName} completed "${task.name}" in ${teamName}.`,
        taskId: task.id || '',
        taskName: task.name,
        room: task.room || 'General',
        teamId: workspace,
        teamName,
        read: false,
      });
    }
  });

  if (notificationsToCreate.length > 0) {
    const sendEmail = activeTeam?.preferences?.emailTaskCompletions ?? true;
    await Promise.all(
      notificationsToCreate.map((n) => createNotificationWithEmail(n, allAssignees, sendEmail))
    );
  }

  return notificationsToCreate;
}

export async function notifyTeamInvite({
  inviterName,
  inviteeEmail,
  teamName,
  activeTeam
}) {
  if (!inviteeEmail) return;

  const sendEmail = activeTeam?.preferences?.emailTeamInvites ?? true;
  if (!sendEmail) return;

  try {
    await addDoc(mailRef, {
      to: inviteeEmail,
      message: {
        subject: `You've been invited to join ${teamName}!`,
        html: `<p>Hi there,</p><p><strong>${inviterName}</strong> has invited you to join their household workspace <strong>${teamName}</strong>.</p><p>Log in to the app with this email address to accept the invite and start collaborating!</p>`,
      }
    });
  } catch (err) {
    console.warn('Failed to send team invite email:', err);
  }
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
